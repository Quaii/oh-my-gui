import { useState } from "react";
import { Globe2, Server } from "lucide-react";
import assets from "@/lib/provider-assets.json";
type Asset={src?:string;favicon?:string;mono?:boolean};
export function ProviderIcon({provider,website,className="size-4"}:{provider:string;website?:string;className?:string}){
 const [failed,setFailed]=useState<Set<string>>(()=>new Set());const id=provider.toLowerCase();
 const asset=(assets as Record<string,Asset>)[id] || (assets as Record<string,Asset>)[/openai|codex/.test(id)?"openai":/anthropic|claude/.test(id)?"anthropic":/google|gemini|vertex/.test(id)?"google":id];
 let favicon=asset?.favicon;try{if(!favicon&&website){const url=new URL(website);if(["http:","https:"].includes(url.protocol)&&!url.username&&!url.password)favicon=url.origin+"/favicon.ico";}}catch{}
 const candidates=[asset?.src,favicon];
 try { if(website){const url=new URL(website);if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password){candidates.push(url.origin+'/apple-touch-icon.png');if(/^api\./.test(url.hostname)){url.hostname=url.hostname.slice(4);candidates.push(url.origin+'/favicon.ico',url.origin+'/apple-touch-icon.png');}}}}catch{}
 const src=candidates.find((s):s is string=>!!s&&!failed.has(s));
 if(src)return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" data-mono={!!asset?.mono&&src===asset.src} className={`provider-mark shrink-0 rounded-sm object-contain ${className}`} onError={()=>setFailed(set=>new Set([...set,src]))}/>;
 const Icon=/local|llama|vllm|studio/.test(id)?Server:Globe2;return <Icon aria-hidden="true" className={`shrink-0 text-muted-foreground ${className}`}/>;
}
