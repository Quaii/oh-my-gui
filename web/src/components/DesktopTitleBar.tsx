import {useEffect,useState} from 'react';
import {Minus,Square,Copy,X} from 'lucide-react';
import {Brand} from './Brand';

type WindowAction='drag'|'minimize'|'toggle-maximize'|'close'|'sync-state';
export function DesktopTitleBar(){
  const [maximized,setMaximized]=useState(false),[error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const command=(action:WindowAction)=>{
    void fetch('/api/desktop/window',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})})
      .then(response=>{if(!response.ok)throw Error('Window control unavailable');setError('');}).catch(()=>setError('Window control unavailable'));
  };
  useEffect(()=>{
    const sync=(event:Event)=>setMaximized(!!(event as CustomEvent<{maximized:boolean}>).detail.maximized);
    window.addEventListener('omp:window-state',sync);command('sync-state');
    const installing=(event:Event)=>setBusy(!!(event as CustomEvent<boolean>).detail);
    window.addEventListener('omp:installer-busy',installing);
    return()=>{window.removeEventListener('omp:window-state',sync);window.removeEventListener('omp:installer-busy',installing);};
  },[]);
  return <header className="desktop-titlebar" aria-label="Desktop window controls">
    <div className="desktop-titlebar-drag" onMouseDown={event=>{if(event.button!==0)return;event.preventDefault();command(event.detail===2?'toggle-maximize':'drag');}}>
      <Brand className="size-4"/><span>omp.</span>
      {error&&<span role="status" className="desktop-titlebar-error">{error}</span>}
    </div>
    <div className="desktop-caption-buttons">
      <button type="button" onClick={()=>command('minimize')} aria-label="Minimize window" title="Minimize"><Minus/></button>
      <button type="button" onClick={()=>command('toggle-maximize')} aria-label={maximized?'Restore window':'Maximize window'} title={maximized?'Restore':'Maximize'}>{maximized?<Copy/>:<Square/>}</button>
      <button type="button" className="desktop-caption-close" disabled={busy} onClick={()=>command('close')} aria-label="Close window" title="Close"><X/></button>
    </div>
  </header>;
}
