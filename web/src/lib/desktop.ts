declare global { interface Window { __OMP_DESKTOP__?:boolean; __OMP_CUSTOM_CHROME__?:boolean; __OMP_INSTALLER__?:boolean; __OMP_TRAY__?:boolean } }
export function isDesktopHost(){return typeof window!=='undefined'&&window.__OMP_DESKTOP__===true;}

/** Reveal native chrome only after the selected setup/workspace view has committed. */
export function revealDesktop(mode: 'installer' | 'setup' | 'workspace') {
  let sent = false;
  const show = () => {
    if (sent) return;
    sent = true;
    void fetch('/api/desktop/window', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ready', mode }) }).catch(() => {});
  };
  // Some hidden WebViews pause RAF. The timer still allows the committed theme
  // and layout to load before the native window's first visible frame.
  const timer = setTimeout(show, 150);
  const frame = requestAnimationFrame(() => requestAnimationFrame(show));
  return () => { sent = true; clearTimeout(timer); cancelAnimationFrame(frame); };
}

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
