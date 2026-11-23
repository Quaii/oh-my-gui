import {Command} from 'lucide-react';
import {currentPlatform,type DesktopPlatform} from '../lib/platform';
export function PlatformKeyIcon({platform=currentPlatform()}:{platform?:DesktopPlatform}){
 if(platform==='mac')return <Command aria-hidden="true" className="size-3.5"/>;
 return <span aria-hidden="true" className="text-[10px] font-medium">Ctrl</span>;
}
