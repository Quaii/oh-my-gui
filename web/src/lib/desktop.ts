declare global { interface Window { __OMP_DESKTOP__?:boolean; __OMP_CUSTOM_CHROME__?:boolean; __OMP_INSTALLER__?:boolean } }
export function isDesktopHost(){return typeof window!=='undefined'&&window.__OMP_DESKTOP__===true;}

let pending:ReturnType<typeof setTimeout>|undefined;
let applied='';
/** The authenticated local backend forwards the accent to the owning native window. */
export function syncDesktopAccent(color:string){
  if(!isDesktopHost()||!/^#[0-9a-f]{6}$/i.test(color))return;
  if(pending)clearTimeout(pending);
  pending=setTimeout(()=>{
    if(applied===color)return;
    void fetch('/api/desktop/appearance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accent:color})})
      .then(response=>{if(response.ok)applied=color;}).catch(()=>{});
  },100);
}
