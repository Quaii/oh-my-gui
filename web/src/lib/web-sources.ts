import { isProviderWebsiteHost } from "../../../shared/provider-website.ts";

export type SearchSource={id:string;title:string;url:string;snippet?:string;favicon?:string};
/** Native providers return structured sources, JSON text, or markdown search results. */
export function webSources(input:any):SearchSource[]{
 const found=new Map<string,SearchSource>();
 const add = (url: string, title?: unknown, snippet?: unknown) => {
   try {
     const parsed = new URL(url);
     if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return;
     const key = parsed.href;
     if (found.has(key)) return;
     const host = parsed.hostname.replace(/\.$/, "");
     found.set(key, {
       id: key,
       url: key,
       title: typeof title === "string" && title.trim() ? title.trim() : parsed.hostname,
       snippet: typeof snippet === "string" ? snippet : undefined,
       favicon: isProviderWebsiteHost(host) ? `/api/browser-favicon?host=${encodeURIComponent(host)}` : undefined,
     });
   } catch {}
 };
 const visit=(value:any,depth=0)=>{if(!value||depth>6)return;if(typeof value==='string'){try{visit(JSON.parse(value),depth+1);}catch{for(const match of value.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g))add(match[2],match[1]);for(const match of value.matchAll(/(?:URL|Link|Source):\s*(https?:\/\/\S+)/gi))add(match[1].replace(/[),.;]+$/,''));}return;}
  if(Array.isArray(value)){value.forEach(v=>visit(v,depth+1));return;}if(typeof value!=='object')return;
  const url=value.url??value.link??value.href;if(typeof url==='string')add(url,value.title??value.name,value.snippet??value.description);
  for(const key of ['sources','results','details','content','text','data'])visit(value[key],depth+1);
 };
 // Native OMP provides result pages here. Links quoted inside snippets are not search results.
 const nativeSources=input?.details?.response?.sources??input?.response?.sources;
 if(Array.isArray(nativeSources)){
  visit(nativeSources);
  return [...found.values()];
 }
 // Some saved results retain only the numbered text summary and its URL lines.
 const blocks=Array.isArray(input?.content)?input.content:[];
 for(const block of typeof input==='string'?[{text:input}]:blocks){
  if(typeof block?.text!=='string')continue;
  for(const match of block.text.matchAll(/^\[\d+\][ \t]+([^\r\n]+)\r?\n[ \t]+(https?:\/\/[^\s]+)[ \t]*$/gm))add(match[2],match[1]);
 }
 if(!found.size)visit(input);
 return [...found.values()];
}

export function searchSiteLabel(sources:SearchSource[]):string{
 const count=new Set(sources.map(source=>new URL(source.url).hostname.replace(/^www\./,''))).size;
 return count?`Searched ${count} ${count===1?'site':'sites'}`:'Search complete · no sources reported';
}
