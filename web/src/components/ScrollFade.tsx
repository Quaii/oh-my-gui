import {useEffect,useRef,useState,type ReactNode,type RefObject} from 'react';
/** Overlay the shared continuous blur on actual scroll edges, including async content. */
export function useScrollEdges(frame:RefObject<HTMLElement|null>,selector?:string){
 const [edges,setEdges]=useState({top:false,bottom:false});
 useEffect(()=>{const node=frame.current;if(!node)return;let scroller:HTMLElement|null=null,content:Element|null=null;
  const update=()=>{if(!scroller)return;setEdges(previous=>{const next={top:scroller!.scrollTop>1,bottom:scroller!.scrollTop+scroller!.clientHeight<scroller!.scrollHeight-1};return previous.top===next.top&&previous.bottom===next.bottom?previous:next;});};
  const sizes=new ResizeObserver(update);
  const bind=()=>{const candidate=selector?node.querySelector(selector):node.querySelector(':scope > [data-slot="scroll-area-viewport"]')??node.firstElementChild;
   if(candidate instanceof HTMLElement&&candidate!==scroller){scroller?.removeEventListener('scroll',update);sizes.disconnect();scroller=candidate;content=null;scroller.addEventListener('scroll',update,{passive:true});sizes.observe(scroller);}
   if(scroller?.firstElementChild&&scroller.firstElementChild!==content){if(content)sizes.unobserve(content);content=scroller.firstElementChild;sizes.observe(content);}update();};
  const children=new MutationObserver(bind);children.observe(node,{childList:true,subtree:true});bind();return()=>{children.disconnect();sizes.disconnect();scroller?.removeEventListener('scroll',update);};
 },[selector]);
 return edges;
}
export function ScrollEdgeOverlays({edges}:{edges:{top:boolean;bottom:boolean}}){return <><span aria-hidden="true" className="scroll-blur-edge is-top" data-visible={edges.top}/><span aria-hidden="true" className="scroll-blur-edge is-bottom" data-visible={edges.bottom}/></>;}
export function ScrollFade({children,className=''}:{children:ReactNode;className?:string}){
 const frame=useRef<HTMLDivElement>(null),edges=useScrollEdges(frame);
 return <div ref={frame} className={'scroll-fade-frame relative min-h-0 '+className}>{children}<ScrollEdgeOverlays edges={edges}/></div>;
}
