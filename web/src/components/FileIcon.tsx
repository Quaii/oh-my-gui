import {useState,useEffect,useSyncExternalStore,type CSSProperties} from 'react';
import {File,FileCode2,FileJson,FileText,FileImage,FileArchive,FileTerminal,FileAudio,FileVideo,FileCog,Database} from 'lucide-react';
import {fileIconName} from '../lib/file-icons';
import {FILE_ICON_THEMES,type FileIconThemeId} from '../lib/file-icon-themes';

const subscribe=(update:()=>void)=>{window.addEventListener('omp:appearance',update);return()=>window.removeEventListener('omp:appearance',update);};
const selected=():FileIconThemeId=>{const value=document.documentElement.dataset.fileIcons;return FILE_ICON_THEMES.some(theme=>theme.value===value)?value as FileIconThemeId:'material';};
function outline(path:string){
 const name=path.replaceAll('\\','/').split('/').at(-1)?.toLowerCase()||'',ext=name.split('.').at(-1)||'';
 if(['json','jsonc','json5'].includes(ext))return FileJson;
 if(['md','mdx','txt','rst','pdf','doc','docx'].includes(ext))return FileText;
 if(['png','jpg','jpeg','webp','gif','svg','ico','bmp'].includes(ext))return FileImage;
 if(['zip','gz','tar','rar','7z'].includes(ext))return FileArchive;
 if(['sh','bash','ps1','bat','cmd'].includes(ext))return FileTerminal;
 if(['mp3','wav','ogg','flac'].includes(ext))return FileAudio;
 if(['mp4','webm','mov','avi'].includes(ext))return FileVideo;
 if(['sql','db','sqlite'].includes(ext))return Database;
 if(['yaml','yml','toml','ini','conf'].includes(ext)||name.startsWith('.env'))return FileCog;
 if(['js','jsx','ts','tsx','mjs','cjs','cpp','c','h','hpp','cs','py','rs','go','java','html','css','scss','vue','svelte','rb','php'].includes(ext))return FileCode2;
 return File;
}
export function FileIcon({path,theme}:{path:string;theme?:FileIconThemeId}){
 const preference=useSyncExternalStore(subscribe,selected,()=> 'material' as const),mode=theme||preference;
 const [failed,setFailed]=useState(false),icon=fileIconName(path),label=(path.split('.').pop()?.toUpperCase()||'File')+' file';
 useEffect(()=>setFailed(false),[icon,mode]);
 if(mode==='minimal'||!icon||failed){const Icon=mode==='minimal'?outline(path):File;return <Icon aria-label={label} data-file-icon-theme={mode} className="size-4 shrink-0 text-muted-foreground"/>;}
 const src=`${import.meta.env?.BASE_URL ?? '/'}file-icons/${icon}.svg`;
 if(mode==='monochrome')return <span role="img" aria-label={label} data-file-icon-theme={mode} className="size-4 shrink-0 bg-current text-muted-foreground" style={{maskImage:`url("${src}")`,WebkitMaskImage:`url("${src}")`,maskSize:'contain',maskPosition:'center',maskRepeat:'no-repeat'} as CSSProperties}/>;
 return <img src={src} alt={label} data-file-icon-theme={mode} className="size-4 shrink-0" onError={()=>setFailed(true)}/>;
}
