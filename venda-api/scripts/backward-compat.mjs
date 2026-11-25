// Existing operations remain identical; only optional parameters may be added.
export function preservesFoundation(previous,current){
 return Object.entries(previous.paths).every(([route,operations])=>{
  if(!current.paths[route])return false;
  const next=structuredClone(current.paths[route]);
  for(const [method,operation] of Object.entries(operations)){
   if(!next[method])return false;
   const original=operation.parameters??[];
   const match=p=>original.some(old=>old.name===p.name&&old.in===p.in);
   const extra=(next[method].parameters??[]).filter(p=>!match(p));
   if(extra.some(p=>p.required===true))return false;
   if(next[method].parameters){next[method].parameters=next[method].parameters.filter(match);if(operation.parameters===undefined&&!next[method].parameters.length)delete next[method].parameters;}
  }
  return JSON.stringify(next)===JSON.stringify(operations);
 });
}
