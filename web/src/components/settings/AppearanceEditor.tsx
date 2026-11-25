import {FILE_ICON_THEMES} from '../../lib/file-icon-themes';
import {FileIcon} from '../FileIcon';
import {ICON_THEMES} from '../../lib/icon-themes';
import {WORKSPACE_ICONS,ICON_PREVIEW_GLYPHS} from '../WorkspaceIcons';
import {ColorPicker} from "../ColorPicker";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { House, FolderOpen, Search, Settings2, MessageSquare, Check, Palette, Type, PanelsTopLeft, Shapes, Download, Upload, Image as ImageIcon } from "lucide-react";
import { House as PhHouse, FolderOpen as PhFolder, MagnifyingGlass, GearSix, ChatCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getAppearance, saveAppearance, DEFAULT_APPEARANCE, validateAppearance, type CustomAppearance, type AppearanceColor } from "@/lib/appearance";
import { getTheme, applyTheme, APP_THEMES } from "@/lib/theme";
import { getAmbience, importedBackground } from "../Appearance";
import { Notice } from "./ManagementShared";
import { SettingsHeading } from "./SettingsHeading";

function Section({title,icon,children}:{title:string;icon:ReactNode;children:ReactNode}) {return <section className="settings-group"><SettingsHeading level="h3" title={<span className="flex items-center gap-2">{icon}{title}</span>} /><div className="appearance-options settings-card settings-card-list">{children}</div></section>;}
function Row({label,hint,children}:{label:string;hint?:string;children:ReactNode}) {return <div className="appearance-option"><div className="min-w-0"><p className="text-[13px] font-medium">{label}</p>{hint&&<p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>}</div><div className="appearance-option-control">{children}</div></div>;}
function Choice({label,value,options,onChange}:{label:string;value:string|number;options:[string|number,string][];onChange:(v:string)=>void}) {return <Select value={String(value)} onValueChange={onChange}><SelectTrigger aria-label={label} className="h-9 w-full rounded-lg"><SelectValue/></SelectTrigger><SelectContent>{options.map(([v,l])=><SelectItem key={v} value={String(v)}>{l}</SelectItem>)}</SelectContent></Select>;}

export function AppearanceEditor() {
 const [a,setA]=useState(getAppearance),[error,setError]=useState("");
 const file=useRef<HTMLInputElement>(null),image=useRef<HTMLInputElement>(null);
 useEffect(()=>{const sync=()=>setA(getAppearance());window.addEventListener("omp:appearance",sync);return()=>window.removeEventListener("omp:appearance",sync)},[]);
 const base=APP_THEMES.find(t=>t.value===getTheme()) || APP_THEMES[0];
 const update=(change:Partial<CustomAppearance>)=>{try{saveAppearance({...getAppearance(),...change});setError("");}catch(e:any){setError(e.message);}};
 const colors:{key:AppearanceColor;label:string;hint:string;fallback:string}[]=[
  {key:"accent",label:"Accent",hint:"Active icons, switches, and key actions",fallback:base.colors.strong},
  {key:"background",label:"Background",hint:"The workspace canvas",fallback:base.colors.panel},
  {key:"foreground",label:"Foreground",hint:"Labels and interface text",fallback:base.foreground},
  {key:"sidebar",label:"Sidebar",hint:"Navigation and conversations",fallback:base.colors.sidebar},
  {key:"chatArea",label:"Chat area",hint:"The floating conversation panel",fallback:a.background||base.colors.panel},
  {key:"userMessages",label:"User messages",hint:"Your message surface",fallback:base.colors.tile},
  {key:"replies",label:"Replies",hint:"Assistant reply text",fallback:a.foreground||base.foreground},
  {key:"codeBlocks",label:"Code blocks",hint:"Code and terminal surfaces",fallback:base.colors.sidebar},
  {key:"borders",label:"Dividers",hint:"Section rules and chart guides",fallback:base.colors.border},
 ];
 async function importTheme(f:File) {
  if(f.size>3_100_000)throw Error("Theme file is too large");
  const data=JSON.parse(await f.text()), valid=validateAppearance(data.appearance);
  if(!APP_THEMES.some(t=>t.value===data.theme))throw Error("Unknown base theme");
  if(data.background!==undefined)localStorage.setItem("ompfe.ambience",importedBackground(data.background));
  if(typeof data.animated==="boolean")localStorage.setItem("ompfe.ambience.motion",data.animated?"1":"0");
  saveAppearance(valid);applyTheme(data.theme);setError("");
 }
 return <div className="settings-stack">
  <SettingsHeading title="Customize this theme" description="Changes apply across this workspace and are saved on this device." action={<Button variant="ghost" size="sm" onClick={()=>saveAppearance(DEFAULT_APPEARANCE)}>Reset</Button>} />
  <Notice error={error}/>
  <Section title="Colors" icon={<Palette className="size-4 text-muted-foreground"/>}>
   {colors.map(c=><Row key={c.key} label={c.label} hint={c.hint}><label className="appearance-color-control"><span className="font-mono text-xs text-muted-foreground">{(a[c.key]||c.fallback).toUpperCase()}</span><ColorPicker label={`${c.label} color`} value={a[c.key]||c.fallback} onChange={value=>update({[c.key]:value})}/></label></Row>)}
   <Row label="Contrast" hint="Increase text and divider definition"><Choice label="Contrast" value={a.contrast} options={[["standard","Standard"],["high","High"]]} onChange={contrast=>update({contrast:contrast as CustomAppearance["contrast"]})}/></Row>
  </Section>
  <Section title="Typography" icon={<Type className="size-4 text-muted-foreground"/>}>
   <Row label="UI font"><Choice label="UI font" value={a.uiFont} options={[["geist","Geist"],["system","System"],["humanist","Humanist"]]} onChange={v=>update({uiFont:v as CustomAppearance["uiFont"]})}/></Row>
   <Row label="Code font"><Choice label="Code font" value={a.codeFont} options={[["geist","Geist Mono"],["system","System monospace"]]} onChange={v=>update({codeFont:v as CustomAppearance["codeFont"]})}/></Row>
   <Row label="Heading font"><Choice label="Heading font" value={a.headingFont} options={[["inherit","Same as interface"],["system","System"],["serif","Serif"]]} onChange={v=>update({headingFont:v as CustomAppearance["headingFont"]})}/></Row>
   <Row label="Chat text size"><Choice label="Chat text size" value={a.chatSize} options={[12,13,14,15,16,18].map(v=>[v,`${v} px`])} onChange={v=>update({chatSize:Number(v)})}/></Row>
   <Row label="Chat line height"><Choice label="Chat line height" value={a.lineHeight} options={[1.4,1.5,1.6,1.7,1.8,2].map(v=>[v,`${v}×`])} onChange={v=>update({lineHeight:Number(v)})}/></Row>
  </Section>
  <Section title="Surfaces & layout" icon={<PanelsTopLeft className="size-4 text-muted-foreground"/>}>
   <Row label="UI scale"><Choice label="UI scale" value={a.scale} options={[85,90,100,110,120].map(v=>[v,`${v}%`])} onChange={v=>update({scale:Number(v)})}/></Row>
   <Row label="Corner radius"><Choice label="Corner radius" value={a.radius} options={[[8,"Subtle · 8 px"],[12,"Soft · 12 px"],[18,"Rounded · 18 px"],[24,"Generous · 24 px"]]} onChange={v=>update({radius:Number(v)})}/></Row>
   <Row label="Shadow"><Choice label="Shadow" value={a.shadow} options={[["none","None"],["soft","Soft"],["deep","Deep"]]} onChange={v=>update({shadow:v as CustomAppearance["shadow"]})}/></Row>
   <Row label="Frosted menus" hint="Blur behind menus and pop-outs. The main panel stays opaque."><Switch checked={a.glass} onCheckedChange={glass=>update({glass})} aria-label="Frosted glass"/></Row>
   <Row label="Translucent cards" hint="Let the workspace background show through Home cards."><Switch checked={a.glassCards} onCheckedChange={glassCards=>update({glassCards})} aria-label="Translucent cards"/></Row>
   <Row label="Translucent sidebar" hint="Let your workspace background show through navigation"><Switch checked={a.translucentSidebar} onCheckedChange={translucentSidebar=>update({translucentSidebar})} aria-label="Translucent sidebar"/></Row>
  </Section>
  <section><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Shapes className="size-4 text-muted-foreground"/>Workspace icons</h3><div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Workspace icon theme">
   {ICON_THEMES.map(set=><button key={set.value} aria-pressed={a.icons===set.value} onClick={()=>update({icons:set.value})} className="icon-theme-card"><span className="mb-5 flex items-center justify-between gap-3 text-muted-foreground">{ICON_PREVIEW_GLYPHS.map(glyph=>{const Icon=WORKSPACE_ICONS[set.value][glyph];return <Icon key={glyph} className="size-5" data-icon-set={set.value} aria-hidden="true"/>;})}</span><span className="flex items-center justify-between text-sm font-medium">{set.label}{a.icons===set.value&&<Check className="size-4 text-primary"/>}</span><span className="mt-1 block text-xs text-muted-foreground">{set.description}</span></button>)}

  </div></section>
  <section><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Shapes className="size-4 text-muted-foreground"/>Editor icons</h3><p className="mb-3 text-xs text-muted-foreground">File icons in the explorer, editor tabs, and changed files. Independent of workspace icons.</p><div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Editor icon theme">{FILE_ICON_THEMES.map(theme=><button key={theme.value} aria-pressed={a.fileIcons===theme.value} onClick={()=>update({fileIcons:theme.value})} className="icon-theme-card"><span className="mb-4 flex items-center gap-5" aria-hidden="true">{['index.tsx','README.md','package.json'].map(path=><FileIcon key={path} path={path} theme={theme.value}/>)}</span><span className="flex items-center justify-between text-sm font-medium">{theme.label}{a.fileIcons===theme.value&&<Check className="size-4 text-primary"/>}</span><span className="mt-1 block text-xs text-muted-foreground">{theme.description}</span></button>)}</div></section>
  <Section title="Background image" icon={<ImageIcon className="size-4 text-muted-foreground"/>}><Row label="Custom image" hint="PNG, JPEG, or WebP up to 2 MB, stored on this device"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={()=>image.current?.click()}>Choose image</Button>{a.image&&<Button variant="ghost" size="sm" onClick={()=>update({image:""})}>Remove</Button>}</div></Row>{a.image&&<img src={a.image} alt="Selected workspace background" className="m-4 h-32 w-[calc(100%-32px)] rounded-xl object-cover"/>}</Section>
  <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>{const blob=new Blob([JSON.stringify({version:2,theme:getTheme(),background:getAmbience(),animated:localStorage.getItem("ompfe.ambience.motion")!=="0",appearance:a},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const el=document.createElement("a");el.href=url;el.download="omp-theme.json";el.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}><Download className="size-4"/>Export theme</Button><Button variant="outline" onClick={()=>file.current?.click()}><Upload className="size-4"/>Import theme</Button></div>
  <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={async e=>{try{const f=e.target.files?.[0];if(f)await importTheme(f);}catch(e:any){setError(e.message);}e.target.value="";}}/>
  <input ref={image} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async e=>{try{const f=e.target.files?.[0];if(!f)return;if(f.size>2_000_000)throw Error("Choose an image smaller than 2 MB");const reader=new FileReader();reader.onload=()=>update({image:String(reader.result)});reader.readAsDataURL(f);}catch(e:any){setError(e.message);}e.target.value="";}}/>
 </div>;
}
