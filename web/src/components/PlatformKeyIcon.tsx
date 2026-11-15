import {Command} from 'lucide-react';
import {currentPlatform,type DesktopPlatform} from '../lib/platform';
export function PlatformKeyIcon({platform=currentPlatform()}:{platform?:DesktopPlatform}){
 if(platform==='mac')return <Command aria-hidden="true" className="size-3.5"/>;
 if(platform==='windows')return <svg data-platform="windows" aria-hidden="true" viewBox="0 0 20 20" className="size-3.5 fill-current"><path d="M2 3.4 8.5 2.5v7H2zm7.8-1.1L18 1.2v8.3H9.8zM2 10.7h6.5v6.9L2 16.7zm7.8 0H18V19l-8.2-1.1z"/></svg>;
 return <span aria-hidden="true" className="text-[10px] font-medium">Ctrl</span>;
}
