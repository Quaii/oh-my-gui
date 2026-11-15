import {useEffect,useRef,useState} from "react";
import {BACKGROUND_PALETTES} from "../Appearance";
import {ShaderGradient} from "../ui/shader-gradient";
import {ReactBitsBackground,REACT_BITS_BACKGROUNDS} from "./ReactBitsBackground";
/** Local capture surface for the installed background thumbnails. No runtime requests. */
export function BackgroundPreview() {
 const preview=useRef<HTMLElement>(null),[ready,setReady]=useState(false);useEffect(()=>{const node=preview.current;if(!node)return;let timer:ReturnType<typeof setTimeout>|undefined;const check=()=>{if(timer||!node.querySelector('canvas,.grid-motion,[data-unsupported]'))return;timer=setTimeout(()=>setReady(true),900);};const observer=new MutationObserver(check);observer.observe(node,{childList:true,subtree:true});check();return()=>{observer.disconnect();clearTimeout(timer);};},[]);
 const value=new URLSearchParams(location.search).get("background"),palette=BACKGROUND_PALETTES[value as keyof typeof BACKGROUND_PALETTES],choice=REACT_BITS_BACKGROUNDS.find(o=>o.value===value);
 return <main ref={preview} data-ready={ready} aria-label="Background preview" style={{position:"fixed",left:0,top:0,width:400,height:250,overflow:"hidden",background:"#111112"}}>{choice?<ReactBitsBackground value={choice.value} animated light={false}/>:palette?<ShaderGradient colors={palette} speed={.08} interactive={false} theme="dark" intensity={.55} grain={.2}/>:null}</main>;
}
