"use client";
import Link from 'next/link';
import {useActionState,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {saveCommerce,type CommerceState} from '../app/commerce-actions';
export function AutomationWizard({organizationId,intentKey}:{organizationId:string;intentKey:string}){
 const router=useRouter(),[step,setStep]=useState(1),[name,setName]=useState(''),[trigger,setTrigger]=useState('opportunity.won'),[title,setTitle]=useState(''),[validation,setValidation]=useState('');
 const [state,action,pending]=useActionState(saveCommerce.bind(null,{kind:'workflows',organizationId,key:intentKey}),{status:'idle',message:''} as CommerceState);
 const alert=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(state.status==='success'){router.push(`/app/o/${organizationId}/automacoes`);router.refresh();}else if(state.status==='error')alert.current?.focus();},[state,router]);
 function next(){if(step===1&&!name.trim()){setValidation('Informe o nome da automação.');return;}if(step===2&&!title.trim()){setValidation('Informe o título da tarefa.');return;}setValidation('');setStep(step+1);}
 return <div className="st-wizard"><Link href={`/app/o/${organizationId}/automacoes`}>← Voltar para automações</Link><ol className="st-progress">{['Quando acontece','O que fazer','Revisar e salvar'].map((label,i)=><li key={label} aria-current={step===i+1?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol><section className="st-card"><header className="st-card-head"><h2>{step===1?'Quando sua automação deve começar?':step===2?'O que você quer que aconteça?':'Revise sua automação'}</h2></header><form className="st-card-content st-detail" action={action} onReset={e=>e.preventDefault()}>
 <input type="hidden" name="name" value={name}/><input type="hidden" name="trigger" value={trigger}/><input type="hidden" name="taskTitle" value={title}/>
 {validation&&<div className="st-notice" role="alert">{validation}</div>}{state.status==='error'&&<div className="st-notice" role="alert" tabIndex={-1} ref={alert}>{state.message}</div>}
 {step===1&&<><label className="st-field">Nome da automação (obrigatório)<input value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label>{[['opportunity.won','Oportunidade ganha'],['task.created','Tarefa criada']].map(([key,label])=><label className="st-radio" key={key}><input type="radio" checked={trigger===key} onChange={()=>setTrigger(key!)} name="event-choice"/>{label}</label>)}<div className="st-notice">Eventos do WhatsApp ficarão disponíveis após conectar o canal oficial.</div></>}
 {step===2&&<><label className="st-radio"><input type="radio" checked readOnly/>Criar tarefa para a equipe</label><label className="st-field">Título da tarefa (obrigatório)<textarea value={title} onChange={e=>setTitle(e.target.value)} maxLength={160}/></label><div className="st-notice">Esta ação cria uma tarefa interna. Não envia mensagens ou gera respostas de IA.</div></>}
 {step===3&&<><h3>{name}</h3><p>Quando: {trigger==='opportunity.won'?'oportunidade ganha':'tarefa criada'}</p><p>Criar tarefa: {title}</p><div className="st-notice">O rascunho será salvo no banco. Depois, um responsável, administrador ou gestor poderá ativá-lo na lista de automações e acompanhar os recibos de execução.</div></>}
 <div className="st-tools">{step>1&&<button type="button" className="vf-button vf-button-secondary" onClick={()=>setStep(step-1)} disabled={pending}>Voltar</button>}{step<3?<button type="button" className="vf-button vf-button-primary" onClick={event=>{event.preventDefault();next();}}>Continuar</button>:<button type="submit" className="vf-button vf-button-primary" disabled={pending}>{pending?'Confirmando no banco…':'Salvar rascunho'}</button>}</div>
 </form></section></div>;
}
