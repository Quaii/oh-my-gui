export type DesktopPlatform='windows'|'mac'|'linux';
export function detectPlatform(platform='',userAgent=''):DesktopPlatform{
 const value=(platform+' '+userAgent).toLowerCase();if(/mac|iphone|ipad|ipod/.test(value))return 'mac';if(/win/.test(value))return 'windows';return 'linux';
}
export function currentPlatform():DesktopPlatform{if(typeof navigator==='undefined')return 'linux';return detectPlatform((navigator as Navigator&{userAgentData?:{platform?:string}}).userAgentData?.platform||navigator.platform,navigator.userAgent);}
export function shortcutLabel(key:string,platform=currentPlatform(),shift=false){return platform==='mac'?'⌘'+(shift?'⇧':'')+key:'Ctrl+'+(shift?'Shift+':'')+key;}
