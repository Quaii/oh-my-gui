import {useId,useLayoutEffect,useRef} from 'react';
import {WorkspaceBackground} from './Appearance';

/** One full-size renderer, clipped to the visible panes rather than resized with them. */
export function SharedWorkspaceBackground() {
  const id=useId().replaceAll(':',''), layer=useRef<HTMLDivElement>(null), clip=useRef<SVGClipPathElement>(null);
  useLayoutEffect(()=>{
    const shell=layer.current?.parentElement;
    if(!shell||!clip.current)return;
    let frame=0,previous='';
    const measure=()=>{
      frame=0;
      const bounds=shell.getBoundingClientRect(),scale=bounds.width/shell.clientWidth||1;
      const panes=Array.from(shell.querySelectorAll<HTMLElement>('.workspace-main,.file-workspace'));
      const regions=panes.flatMap(pane=>{
        const rect=pane.getBoundingClientRect(),slot=pane.closest<HTMLElement>('.file-panel-motion');
        if(!rect.width||!rect.height||pane.closest('[hidden]'))return [];
        const style=getComputedStyle(pane);
        if(style.visibility==='hidden')return [];
        const visible=slot?.getBoundingClientRect()||rect;
        const left=Math.max(rect.left,visible.left),right=Math.min(rect.right,visible.right);
        if(right<=left)return [];
        return [{x:(left-bounds.left)/scale,y:(rect.top-bounds.top)/scale,width:(right-left)/scale,height:rect.height/scale,radius:parseFloat(style.borderTopLeftRadius)||0}];
      });
      const signature=JSON.stringify(regions);
      if(signature===previous)return;
      previous=signature;
      clip.current?.replaceChildren(...regions.map(region=>{
        const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
        for(const [key,value]of Object.entries(region))rect.setAttribute(key==='radius'?'rx':key,String(value));
        return rect;
      }));
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    const resize=new ResizeObserver(schedule);
    const bind=()=>{
      resize.disconnect();resize.observe(shell);
      shell.querySelectorAll('.workspace-main,.file-panel-motion,.file-workspace').forEach(node=>resize.observe(node));
      schedule();
    };
    const mutations=new MutationObserver(records=>{
      if(records.some(record=>record.type==='attributes'||[...record.addedNodes,...record.removedNodes].some(node=>node instanceof Element&&(node.matches('.workspace-main,.file-panel-motion,.file-workspace')||node.querySelector('.workspace-main,.file-panel-motion,.file-workspace')))))bind();
    });
    mutations.observe(shell,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-focused','data-overlay']});
    window.addEventListener('omp:appearance',schedule);bind();
    return()=>{resize.disconnect();mutations.disconnect();cancelAnimationFrame(frame);window.removeEventListener('omp:appearance',schedule);};
  },[]);
  return <div ref={layer} className="shared-workspace-background" style={{clipPath:`url(#${id})`}} aria-hidden="true">
    <svg width="0" height="0"><defs><clipPath id={id} clipPathUnits="userSpaceOnUse" ref={clip}/></defs></svg>
    <WorkspaceBackground/>
  </div>;
}
