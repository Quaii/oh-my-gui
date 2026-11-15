export type SearchSource={id:string;title:string;url:string;snippet?:string;favicon?:string};
/** Native providers return structured sources, JSON text, or markdown search results. */
export function webSources(input:any):SearchSource[]{
 const found=new Map<string,SearchSource>();
 const add=(url:string,title?:string,snippet?:string)=>{try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||found.has(url)||found.size>=40)return;found.set(url,{id:url,url,title:title?.trim()||parsed.hostname,snippet});}catch{}};
 const visit=(value:any,depth=0)=>{if(!value||depth>6)return;if(typeof value==='string'){try{visit(JSON.parse(value),depth+1);}catch{for(const match of value.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g))add(match[2],match[1]);for(const match of value.matchAll(/(?:URL|Link|Source):\s*(https?:\/\/\S+)/gi))add(match[1].replace(/[),.;]+$/,''));}return;}
  if(Array.isArray(value)){value.forEach(v=>visit(v,depth+1));return;}if(typeof value!=='object')return;
  const url=value.url??value.link??value.href;if(typeof url==='string')add(url,value.title??value.name,value.snippet??value.description);
  for(const key of ['sources','results','details','content','text','data'])visit(value[key],depth+1);
 };visit(input);return [...found.values()];
}
