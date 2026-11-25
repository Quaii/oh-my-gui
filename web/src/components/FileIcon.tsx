import {useState,useEffect,useSyncExternalStore,type CSSProperties} from 'react';
import {File,FileCode2,FileJson,FileText,FileImage,FileArchive,FileTerminal,FileAudio,FileVideo,FileCog,Database} from 'lucide-react';
import {TbFile,TbFileCode,TbJson,TbFileText,TbPhoto,TbFileZip,TbTerminal2,TbFileMusic,TbVideo,TbFileSettings,TbDatabase} from 'react-icons/tb';
import {HiDocument,HiCodeBracketSquare,HiCodeBracket,HiDocumentText,HiPhoto,HiArchiveBox,HiCommandLine,HiMusicalNote,HiFilm,HiCog6Tooth,HiCircleStack} from 'react-icons/hi2';
import {File as PhFile,FileCode as PhFileCode,BracketsCurly,FileText as PhFileText,FileImage as PhFileImage,FileZip,TerminalWindow,FileAudio as PhFileAudio,FileVideo as PhFileVideo,GearSix,Database as PhDatabase} from '@phosphor-icons/react';
import {fileIconName} from '../lib/file-icons';
import {FILE_ICON_THEMES,type FileIconThemeId} from '../lib/file-icon-themes';

const subscribe=(update:()=>void)=>{window.addEventListener('omp:appearance',update);return()=>window.removeEventListener('omp:appearance',update);};
const selected=():FileIconThemeId=>{const value=document.documentElement.dataset.fileIcons;return FILE_ICON_THEMES.some(theme=>theme.value===value)?value as FileIconThemeId:'material';};
const categoryIcons = {
 file: {minimal:File, tabler:TbFile, heroicons:HiDocument, phosphor:PhFile},
 code: {minimal:FileCode2, tabler:TbFileCode, heroicons:HiCodeBracketSquare, phosphor:PhFileCode},
 json: {minimal:FileJson, tabler:TbJson, heroicons:HiCodeBracket, phosphor:BracketsCurly},
 text: {minimal:FileText, tabler:TbFileText, heroicons:HiDocumentText, phosphor:PhFileText},
 image: {minimal:FileImage, tabler:TbPhoto, heroicons:HiPhoto, phosphor:PhFileImage},
 archive: {minimal:FileArchive, tabler:TbFileZip, heroicons:HiArchiveBox, phosphor:FileZip},
 terminal: {minimal:FileTerminal, tabler:TbTerminal2, heroicons:HiCommandLine, phosphor:TerminalWindow},
 audio: {minimal:FileAudio, tabler:TbFileMusic, heroicons:HiMusicalNote, phosphor:PhFileAudio},
 video: {minimal:FileVideo, tabler:TbVideo, heroicons:HiFilm, phosphor:PhFileVideo},
 config: {minimal:FileCog, tabler:TbFileSettings, heroicons:HiCog6Tooth, phosphor:GearSix},
 database: {minimal:Database, tabler:TbDatabase, heroicons:HiCircleStack, phosphor:PhDatabase},
};

function fileCategory(path:string):keyof typeof categoryIcons {
 const name=path.replaceAll('\\','/').split('/').at(-1)?.toLowerCase()||'',ext=name.split('.').at(-1)||'';
 if(['json','jsonc','json5'].includes(ext))return 'json';
 if(['md','mdx','txt','rst','pdf','doc','docx'].includes(ext))return 'text';
 if(['png','jpg','jpeg','webp','gif','svg','ico','bmp'].includes(ext))return 'image';
 if(['zip','gz','tar','rar','7z'].includes(ext))return 'archive';
 if(['sh','bash','ps1','bat','cmd'].includes(ext))return 'terminal';
 if(['mp3','wav','ogg','flac'].includes(ext))return 'audio';
 if(['mp4','webm','mov','avi'].includes(ext))return 'video';
 if(['sql','db','sqlite'].includes(ext))return 'database';
 if(['yaml','yml','toml','ini','conf'].includes(ext)||name.startsWith('.env'))return 'config';
 if(['js','jsx','ts','tsx','mjs','cjs','cpp','c','h','hpp','cs','py','rs','go','java','html','css','scss','vue','svelte','rb','php'].includes(ext))return 'code';
 return 'file';
}
export function FileIcon({path,theme}:{path:string;theme?:FileIconThemeId}){
 const preference=useSyncExternalStore(subscribe,selected,()=> 'material' as const),mode=theme||preference;
 const [failed,setFailed]=useState(false),icon=fileIconName(path),label=(path.split('.').pop()?.toUpperCase()||'File')+' file';
 useEffect(()=>setFailed(false),[icon,mode]);
 if(mode!=='material'&&mode!=='monochrome'){
  const Icon=categoryIcons[fileCategory(path)][mode];
  return <Icon aria-label={label} data-file-icon-theme={mode} className="size-4 shrink-0 text-muted-foreground"
    {...(mode==='phosphor'?{weight:'duotone' as const}:{})}/>;
 }
 if(!icon||failed)return <File aria-label={label} data-file-icon-theme={mode} className="size-4 shrink-0 text-muted-foreground"/>;
 const src=`${import.meta.env?.BASE_URL ?? '/'}file-icons/${icon}.svg`;
 if(mode==='monochrome')return <span role="img" aria-label={label} data-file-icon-theme={mode} className="size-4 shrink-0 bg-current text-muted-foreground" style={{maskImage:`url("${src}")`,WebkitMaskImage:`url("${src}")`,maskSize:'contain',maskPosition:'center',maskRepeat:'no-repeat'} as CSSProperties}/>;
 return <img src={src} alt={label} data-file-icon-theme={mode} className="size-4 shrink-0" onError={()=>setFailed(true)}/>;
}
