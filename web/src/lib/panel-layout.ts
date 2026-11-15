export const MIN_EDITOR_WIDTH=440;
export function editorPanelBounds(frameWidth:number,sidebarWidth:number,composerWidth=760){
 const available=Math.max(0,frameWidth-sidebarWidth-16),minimumChat=Math.max(680,composerWidth);
 return {available,minimumChat,overlay:available<minimumChat+MIN_EDITOR_WIDTH+8,maxEditor:Math.max(MIN_EDITOR_WIDTH,available-minimumChat-8)};
}
export function fileBreadcrumb(root:string,file?:string){
 const clean=(s:string)=>s.replaceAll('\\','/').replace(/\/$/,'');const r=clean(root),f=file?clean(file):'';
 const name=(s:string)=>s.split('/').filter(Boolean).at(-1)||s;
 if(!f)return {root:name(r),parent:'',file:'Files'};
 const relative=f.toLowerCase().startsWith(r.toLowerCase()+'/')?f.slice(r.length+1):name(f);const parts=relative.split('/');
 return {root:name(r),parent:parts.slice(0,-1).join('/'),file:parts.at(-1)||'Files'};
}
