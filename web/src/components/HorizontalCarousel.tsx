import {useEffect, useRef, useState, type ReactNode} from 'react';

/** Shared overflow strip: wheel, pointer drag, touch, and keyboard scrolling. */
export function HorizontalCarousel({children,label,className=''}:{children:ReactNode;label:string;className?:string}) {
  const ref=useRef<HTMLDivElement>(null);
  const drag=useRef<{id:number;x:number;left:number;moved:boolean}|null>(null);
  const suppressClick=useRef(false);
  const [edges,setEdges]=useState({start:false,end:false});
  useEffect(()=>{
    const node=ref.current;if(!node)return;
    const measure=()=>setEdges({start:node.scrollLeft>1,end:node.scrollLeft+node.clientWidth<node.scrollWidth-1});
    const wheel=(event:WheelEvent)=>{
      if(event.ctrlKey||node.scrollWidth<=node.clientWidth)return;
      const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?node.clientWidth:1);
      if(!delta)return;
      event.preventDefault();
      node.scrollBy({left:delta,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    };
    const observer=new ResizeObserver(measure);observer.observe(node);
    if(node.firstElementChild)observer.observe(node.firstElementChild);
    node.addEventListener('scroll',measure,{passive:true});node.addEventListener('wheel',wheel,{passive:false});measure();
    return()=>{observer.disconnect();node.removeEventListener('scroll',measure);node.removeEventListener('wheel',wheel);};
  },[children]);
  return <div ref={ref} role="region" aria-label={label} tabIndex={0} className={`horizontal-carousel ${className}`} data-fade-start={edges.start} data-fade-end={edges.end}
    onDragStart={event=>event.preventDefault()}
    onPointerDown={event=>{if(event.pointerType!=='mouse'||event.button!==0)return;suppressClick.current=false;drag.current={id:event.pointerId,x:event.clientX,left:event.currentTarget.scrollLeft,moved:false};}}
    onPointerMove={event=>{const state=drag.current;if(!state||state.id!==event.pointerId)return;const distance=event.clientX-state.x;if(!state.moved&&Math.abs(distance)>5){state.moved=true;event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.dataset.dragging='true';}if(state.moved){event.preventDefault();event.currentTarget.scrollLeft=state.left-distance;}}}
    onPointerUp={event=>{if(drag.current?.id!==event.pointerId)return;suppressClick.current=drag.current.moved;drag.current=null;delete event.currentTarget.dataset.dragging;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
    onPointerCancel={event=>{drag.current=null;delete event.currentTarget.dataset.dragging;}}
    onClickCapture={event=>{if(suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}}
    onKeyDown={event=>{if(event.target!==event.currentTarget||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.currentTarget.scrollTo({left:event.key==='Home'?0:event.key==='End'?event.currentTarget.scrollWidth:event.currentTarget.scrollLeft+(event.key==='ArrowRight'?200:-200),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}
  ><div className="horizontal-carousel-track">{children}</div></div>;
}
