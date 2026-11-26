import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import type { Principal } from './auth.js';
import { AuthService } from './auth.js';
import { membership, uuid, type Role } from './policy.js';
import { digest } from './config.js';
import { recordChange, type DomainAction } from './events.js';

export const resources = {
  contacts: {event:'contact', search:'name', fields:{name:'name',phone:'phone',email:'email'}},
  opportunities: {event:'opportunity',search:'title',fields:{title:'title',contactId:'contact_id',stage:'stage',amountCents:'amount_cents'}},
  tasks: {event:'task',search:'title',fields:{title:'title',contactId:'contact_id',opportunityId:'opportunity_id',dueAt:'due_at',completed:'completed'}},
  knowledge: {event:'knowledge',search:'title',fields:{title:'title',content:'content'}},
  workflows: {event:'workflow',search:'name',fields:{name:'name',trigger:'trigger',taskTitle:'task_title'}},
} as const;
export type Resource = keyof typeof resources;
type Row = Record<string, unknown> & {id:string;organization_id:string;archived:boolean;version:number;created_at:Date;updated_at:Date};
type Input = Record<string, unknown>;
export class CommerceService {
  constructor(private readonly auth: AuthService) {}
  async tx<T>(actor: Principal, organizationId:string, write:boolean, fn:(client:PoolClient,role:Role)=>Promise<T>) {
    uuid(organizationId);
    return this.auth.db.tx({userId:actor.userId,sessionHash:actor.sessionHash,organizationId},async client=>{
      await this.auth.activeInTransaction(client,actor);
      const role = await membership(client,actor.userId,organizationId);
      if(role==='billing' || write && role==='viewer') throw new ForbiddenException();
      return fn(client,role);
    });
  }
  private view(resource:Resource,row:Row) {
    const mapped:Input = {id:row.id,organizationId:row.organization_id,archived:row.archived,version:row.version,createdAt:row.created_at.toISOString(),updatedAt:row.updated_at.toISOString()};
    for(const [key,column] of Object.entries(resources[resource].fields)) {
      const value=row[column]; mapped[key]=value instanceof Date ? value.toISOString() : key==='amountCents' && value!==null ? Number(value) : value;
    }
    if(resource==='opportunities') mapped.currency='BRL';
    if(resource==='workflows') mapped.status=row.status;
    return mapped;
  }
  private values(resource:Resource,body:Input) {
    const fields:Record<string,string>=resources[resource].fields;
    if(!body || Object.keys(body).length===0 || Object.keys(body).some(key=>!Object.hasOwn(fields,key))) throw new BadRequestException();
    const values=Object.entries(body).filter(([,value])=>value!==undefined).map(([key,value])=>({column:fields[key]!,value:typeof value==='string'?value.trim():value}));
    if(!values.length) throw new BadRequestException();
    return values;
  }
  private async references(client:PoolClient,org:string,body:Input) {
    for(const [field,table] of [['contactId','contacts'],['opportunityId','opportunities']] as const) {
      if(body[field]!==undefined && body[field]!==null) {
        uuid(body[field]);
        const row=await client.query(`SELECT id FROM venda.${table} WHERE organization_id=$1 AND id=$2 AND NOT archived FOR KEY SHARE`,[org,body[field]]);
        if(!row.rowCount) throw new NotFoundException();
      }
    }
  }
  private async once<T>(client:PoolClient,actor:Principal,org:string,scope:string,key:unknown,body:Input,fn:()=>Promise<T>):Promise<T> {
    if(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(key)) throw new BadRequestException();
    const requestHash=digest(JSON.stringify(body,Object.keys(body).sort()));
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${org}:${actor.userId}:${scope}:${key}`]);
    const old=await client.query<{request_hash:string;result:T}>('SELECT request_hash,result FROM venda.commerce_idempotency WHERE organization_id=$1 AND actor_id=$2 AND scope=$3 AND key=$4',[org,actor.userId,scope,key]);
    if(old.rows[0]) {if(old.rows[0].request_hash!==requestHash) throw new ConflictException();return old.rows[0].result;}
    const result=await fn();
    await client.query('INSERT INTO venda.commerce_idempotency(organization_id,actor_id,scope,key,request_hash,result) VALUES($1,$2,$3,$4,$5,$6)',[org,actor.userId,scope,key,requestHash,JSON.stringify(result)]);
    return result;
  }
  async list(actor:Principal,org:string,resource:Resource,query:Record<string,unknown>) {
    const q=query.q===undefined?'':query.q;
    const limit=query.limit===undefined?50:Number(query.limit);
    if(typeof q!=='string'||q.length>120||!Number.isInteger(limit)||limit<1||limit>100) throw new BadRequestException();
    const cursor=query.cursor===undefined?null:uuid(query.cursor);
    return this.tx(actor,org,false,async client=>{
      const escaped=q.replace(/[\\%_]/g,'\\$&');
      const result=await client.query<Row>(`SELECT * FROM venda.${resource} WHERE organization_id=$1 AND NOT archived AND ($2::uuid IS NULL OR id>$2) AND ${resources[resource].search} ILIKE $3 ORDER BY id LIMIT $4`,[org,cursor,`%${escaped}%`,limit+1]);
      const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit);
      return {data:rows.map(row=>this.view(resource,row)),nextCursor:hasMore?rows.at(-1)!.id:null};
    });
  }
  async get(actor:Principal,org:string,resource:Resource,id:string) {
    uuid(id);
    return this.tx(actor,org,false,async client=>{
      const row=await client.query<Row>(`SELECT * FROM venda.${resource} WHERE organization_id=$1 AND id=$2`,[org,id]);
      if(!row.rows[0]) throw new NotFoundException();
      return this.view(resource,row.rows[0]);
    });
  }
  async create(actor:Principal,org:string,resource:Resource,body:Input,key:unknown,requestId:string) {
    const values=this.values(resource,body);
    return this.tx(actor,org,true,client=>this.once(client,actor,org,`${resource}.create`,key,body,async()=>{
      await this.references(client,org,body);
      const row=await client.query<Row>(`INSERT INTO venda.${resource}(organization_id,${values.map(v=>v.column).join(',')}) VALUES($1,${values.map((_,i)=>`$${i+2}`).join(',')}) RETURNING *`,[org,...values.map(v=>v.value)]);
      const result=row.rows[0]!;
      await recordChange(client,org,actor.userId,`${resources[resource].event}.created` as DomainAction,result.id,requestId);
      if(resource==='opportunities'&&body.stage==='won') await recordChange(client,org,actor.userId,'opportunity.won',result.id,requestId);
      return this.view(resource,result);
    }));
  }
  async update(actor:Principal,org:string,resource:Resource,id:string,body:Input,key:unknown,version:unknown,requestId:string,archive=false) {
    uuid(id);
    if(typeof version!=='string'||!/^[1-9][0-9]{0,8}$/.test(version)) throw new BadRequestException();
    const values=archive?[{column:'archived',value:true}]:this.values(resource,body);
    return this.tx(actor,org,true,client=>this.once(client,actor,org,`${resource}.${archive?'archive':'update'}:${id}`,key,{...body,version},async()=>{
      if(resource==='workflows') await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`venda.workflow.${org}:${id}`]);
      await this.references(client,org,body);
      const found=await client.query<Row>(`SELECT * FROM venda.${resource} WHERE organization_id=$1 AND id=$2 FOR UPDATE`,[org,id]);
      if(!found.rows[0]) throw new NotFoundException();
      if(found.rows[0].version!==Number(version)||found.rows[0].archived) throw new ConflictException();
      if(resource==='workflows'&&!archive&&found.rows[0].status==='active') throw new ConflictException();
      const changed=await client.query<Row>(`UPDATE venda.${resource} SET ${values.map((v,i)=>`${v.column}=$${i+3}`).join(',')},version=version+1,updated_at=clock_timestamp() WHERE organization_id=$1 AND id=$2 RETURNING *`,[org,id,...values.map(v=>v.value)]);
      await recordChange(client,org,actor.userId,`${resources[resource].event}.${archive?'archived':'updated'}` as DomainAction,id,requestId);
      if(resource==='opportunities'&&!archive&&body.stage==='won'&&found.rows[0].stage!=='won') await recordChange(client,org,actor.userId,'opportunity.won',id,requestId);
      return this.view(resource,changed.rows[0]!);
    }));
  }
  async overview(actor:Principal,org:string) {
    return this.tx(actor,org,false,async client=>{
      const row=await client.query<{contacts:string;open_opportunities:string;pending_tasks:string;proposal_amount_cents:string}>(`SELECT (SELECT count(*) FROM venda.contacts WHERE organization_id=$1 AND NOT archived) AS contacts,(SELECT count(*) FROM venda.opportunities WHERE organization_id=$1 AND NOT archived AND stage NOT IN ('won','lost')) AS open_opportunities,(SELECT count(*) FROM venda.tasks WHERE organization_id=$1 AND NOT archived AND NOT completed) AS pending_tasks,(SELECT COALESCE(sum(amount_cents),0) FROM venda.opportunities WHERE organization_id=$1 AND NOT archived AND stage='proposal') AS proposal_amount_cents`,[org]);
      const r=row.rows[0]!;
      // Aggregate can exceed JS safe integer; do not round financial values silently.
      const amount=Number(r.proposal_amount_cents); if(!Number.isSafeInteger(amount)) throw new ConflictException();
      return {contacts:Number(r.contacts),openOpportunities:Number(r.open_opportunities),pendingTasks:Number(r.pending_tasks),proposalAmountCents:amount,currency:'BRL',confirmedRevenueCents:null};
    });
  }
  async history(actor:Principal,org:string,query:Record<string,unknown>){
    const validDate=(value:unknown)=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new BadRequestException();const date=new Date(value+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new BadRequestException();return value;};
    return this.tx(actor,org,false,async client=>{
      const organization=(await client.query<{timezone:string;today:string}>("SELECT timezone,to_char(clock_timestamp() AT TIME ZONE timezone,'YYYY-MM-DD') AS today FROM venda.organizations WHERE id=$1",[org])).rows[0];if(!organization)throw new NotFoundException();
      const to=query.to===undefined?organization.today:validDate(query.to),from=query.from===undefined?new Date(Date.parse(to+'T00:00:00Z')-29*86400000).toISOString().slice(0,10):validDate(query.from);
      validDate(from);if(from.startsWith('0000')||to.startsWith('0000'))throw new BadRequestException();
      const days=(Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000;if(days<0||days>91||to>organization.today)throw new BadRequestException();
      const rows=await client.query<{date:string;contacts_created:string;opportunities_created:string;tasks_created:string}>(`WITH days AS (SELECT day::date FROM generate_series($2::date,$3::date,interval '1 day') AS day),events AS (
       SELECT (created_at AT TIME ZONE $4)::date AS day,'contact' AS kind FROM venda.contacts WHERE organization_id=$1 AND created_at>=($2::date::timestamp AT TIME ZONE $4) AND created_at<(($3::date+1)::timestamp AT TIME ZONE $4)
       UNION ALL SELECT (created_at AT TIME ZONE $4)::date,'opportunity' FROM venda.opportunities WHERE organization_id=$1 AND created_at>=($2::date::timestamp AT TIME ZONE $4) AND created_at<(($3::date+1)::timestamp AT TIME ZONE $4)
       UNION ALL SELECT (created_at AT TIME ZONE $4)::date,'task' FROM venda.tasks WHERE organization_id=$1 AND created_at>=($2::date::timestamp AT TIME ZONE $4) AND created_at<(($3::date+1)::timestamp AT TIME ZONE $4)
      ) SELECT to_char(days.day,'YYYY-MM-DD') AS date,count(events.kind) FILTER(WHERE events.kind='contact')::text AS contacts_created,count(events.kind) FILTER(WHERE events.kind='opportunity')::text AS opportunities_created,count(events.kind) FILTER(WHERE events.kind='task')::text AS tasks_created FROM days LEFT JOIN events ON events.day=days.day GROUP BY days.day ORDER BY days.day`,[org,from,to,organization.timezone]);
      return{from,to,timezone:organization.timezone,financialSource:'unconfigured',confirmedRevenueCents:null,series:rows.rows.map(row=>({date:row.date,contactsCreated:Number(row.contacts_created),opportunitiesCreated:Number(row.opportunities_created),tasksCreated:Number(row.tasks_created)}))};
    });
  }
  async workflowState(actor:Principal,org:string,id:string,state:'active'|'paused',key:unknown,version:unknown,requestId:string) {
    uuid(id);
    if(typeof version!=='string'||!/^[1-9][0-9]{0,8}$/.test(version)) throw new BadRequestException();
    return this.tx(actor,org,true,async(client,role)=>{
      if(!['owner','admin','manager'].includes(role)) throw new ForbiddenException();
      return this.once(client,actor,org,`workflows.${state}:${id}`,key,{state,version},async()=>{
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`venda.workflow.${org}:${id}`]);
        const found=await client.query<Row>('SELECT * FROM venda.workflows WHERE organization_id=$1 AND id=$2 FOR UPDATE',[org,id]);
        if(!found.rows[0]) throw new NotFoundException();
        if(found.rows[0].archived||found.rows[0].version!==Number(version)) throw new ConflictException();
        const result=await client.query<Row>("UPDATE venda.workflows SET status=$3,activated_at=CASE WHEN $3='active' THEN clock_timestamp() ELSE activated_at END,activated_by=CASE WHEN $3='active' THEN $4::uuid ELSE activated_by END,version=version+1,updated_at=clock_timestamp() WHERE organization_id=$1 AND id=$2 RETURNING *",[org,id,state,actor.userId]);
        await recordChange(client,org,actor.userId,'workflow.updated',id,requestId);
        return this.view('workflows',result.rows[0]!);
      });
    });
  }
  async executions(actor:Principal,org:string,id:string) {
    uuid(id);
    return this.tx(actor,org,false,async client=>{
      if(!(await client.query('SELECT id FROM venda.workflows WHERE organization_id=$1 AND id=$2',[org,id])).rowCount) throw new NotFoundException();
      const rows=await client.query<{id:string;task_id:string;created_at:Date}>('SELECT id,task_id,created_at FROM venda.automation_receipts WHERE organization_id=$1 AND workflow_id=$2 ORDER BY created_at DESC,id LIMIT 100',[org,id]);
      return {data:rows.rows.map(r=>({id:r.id,taskId:r.task_id,createdAt:r.created_at.toISOString()}))};
    });
  }
}
