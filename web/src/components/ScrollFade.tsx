import {useEffect,useRef,useState,type ReactNode,type RefObject} from "react";
/** Overlay the same continuous masked blur at the edges of any scrolling surface. */
export function useScrollEdges(frame:RefObject<HTMLElement|null>){
 const [edges,setEdges]=useState({top:false,bottom:false});
 useEffect(()=>{const scroller=frame.current?.querySelector(':scope > [data-slot="scroll-area-viewport"]')??frame.current?.firstElementChild;if(!(scroller instanceof HTMLElement))return;
  const update=()=>setEdges(previous=>{const next={top:scroller.scrollTop>1,bottom:scroller.scrollTop+scroller.clientHeight<scroller.scrollHeight-1};return previous.top===next.top&&previous.bottom===next.bottom?previous:next;});
  const observer=new ResizeObserver(update);observer.observe(scroller);if(scroller.firstElementChild)observer.observe(scroller.firstElementChild);scroller.addEventListener('scroll',update,{passive:true});update();return()=>{observer.disconnect();scroller.removeEventListener('scroll',update);};
 },[]);
 return edges;
}
export function ScrollEdgeOverlays({edges}:{edges:{top:boolean;bottom:boolean}}){return <><span aria-hidden="true" className="scroll-blur-edge is-top" data-visible={edges.top}/><span aria-hidden="true" className="scroll-blur-edge is-bottom" data-visible={edges.bottom}/></>;}
export function ScrollFade({children,className=""}:{children:ReactNode;className?:string}){
 const frame=useRef<HTMLDivElement>(null),edges=useScrollEdges(frame);
 return <div ref={frame} className={`scroll-fade-frame relative min-h-0 ${className}`}>{children}<ScrollEdgeOverlays edges={edges}/></div>;
}
