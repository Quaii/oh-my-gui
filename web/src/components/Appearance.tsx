import {ScrollArea} from "./ui/scroll-area";
import {ColorPicker} from "./ColorPicker";
import { Slider } from "@/components/ui/slider";
import { ReactBitsBackground, REACT_BITS_BACKGROUNDS, type ReactBitsBackgroundId } from "./backgrounds/ReactBitsBackground";
import { getAppearance,saveAppearance } from "@/lib/appearance";
import { lazy, Suspense, useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Check, Moon, Waves } from "lucide-react";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { Switch } from "@/components/ui/switch";
import { APP_THEMES, applyTheme, getTheme, isLightTheme } from "@/lib/theme";

const ShaderGradient = lazy(() => import("@/components/ui/shader-gradient").then(m => ({ default: m.ShaderGradient })));
const KEY = "ompfe.ambience";
type ClassicAmbience = "off" | "ember" | "ocean" | "aurora" | "dusk" | "moss" | "blush" | "silver";
export type Ambience=ClassicAmbience|ReactBitsBackgroundId;
const palettes:Record<Exclude<ClassicAmbience,"off">,string[]> = { ember:["#ed7545","#a4432b","#e6a75d","#7d3831"], ocean:["#458c9b","#5b65a4","#71ada2","#3b4f77"], aurora:["#517d80","#496650","#888bba","#283546"], dusk:["#885c82","#b57c72","#6b6695","#453c65"], moss:["#7d8755","#486857","#b3ad7c","#354939"], blush:["#bb8a99","#d8ada1","#947a98","#715c74"], silver:["#81909d","#bac1c6","#707b83","#535c6a"] };
export const BACKGROUND_PALETTES=palettes;
export const BACKGROUND_OPTIONS: {value:Ambience;label:string}[] = [{value:"off",label:"None"},{value:"ember",label:"Ember"},{value:"ocean",label:"Tide"},{value:"aurora",label:"Aurora"},{value:"dusk",label:"Dusk"},{value:"moss",label:"Moss"},{value:"blush",label:"Blush"},{value:"silver",label:"Silver"},...REACT_BITS_BACKGROUNDS];

function getAmbience(): Ambience {
  const value = localStorage.getItem(KEY);
  return BACKGROUND_OPTIONS.some(o=>o.value===value) ? value as Ambience : "off";
}

function useAppearance() {
  const [custom,setCustom] = useState(getAppearance);
  const [theme, setTheme] = useState(getTheme);
  const [ambience, setAmbience] = useState(getAmbience);
  const [animated, setAnimated] = useState(() => localStorage.getItem(KEY + ".motion") !== "0");
  useEffect(() => {
    const sync = () => {
      const next = getTheme();
      if (document.documentElement.dataset.theme !== next) applyTheme(next);
      setCustom(getAppearance());
      setTheme(next); setAmbience(getAmbience()); setAnimated(localStorage.getItem(KEY + ".motion") !== "0");
    };
    window.addEventListener("omp:appearance", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("omp:appearance", sync); window.removeEventListener("storage", sync); };
  }, []);
  const update = (key: string, value: string) => { localStorage.setItem(key, value); window.dispatchEvent(new Event("omp:appearance")); };
  return { custom, theme, ambience, animated, setAmbience: (v: Ambience) => {localStorage.setItem(KEY,v);if(getAppearance().image)saveAppearance({...getAppearance(),image:""});else window.dispatchEvent(new Event("omp:appearance"));}, setAnimated: (v: boolean) => update(KEY + ".motion", v ? "1" : "0") };
}

export function AppearanceControls({expanded=false}:{expanded?:boolean}={}) {
  const { custom,theme, ambience, animated, setAmbience, setAnimated } = useAppearance();
  const [adjustment,setAdjustment]=useState({backgroundFade:custom.backgroundFade,backgroundBlur:custom.backgroundBlur});
  useEffect(()=>setAdjustment({backgroundFade:custom.backgroundFade,backgroundBlur:custom.backgroundBlur}),[custom.backgroundFade,custom.backgroundBlur]);
  const [scheme,setScheme]=useState(()=>isLightTheme(theme)?"light":"dark");
  useEffect(()=>setScheme(isLightTheme(theme)?"light":"dark"),[theme]);
  return (
    <div className={expanded?"appearance-controls appearance-controls-expanded":"appearance-controls space-y-6"}>
      <div>
        <div className="mb-3 flex items-center gap-2 text-[13px] font-medium"><Moon className="size-4 text-muted-foreground" /> Colour scheme</div>
        <div className="mb-4 flex gap-1 rounded-lg bg-secondary/60 p-1" role="group" aria-label="Color mode">{["light","dark"].map(mode=><button key={mode} onClick={()=>{setScheme(mode);applyTheme(mode==="light"?"daylight":"dark");}} aria-pressed={scheme===mode} className={`flex-1 rounded-md py-1.5 text-xs capitalize transition-colors ${scheme===mode?"bg-background shadow-sm":"text-muted-foreground"}`}>{mode}</button>)}</div>
        <ThemeSelector themes={APP_THEMES.filter(t=>t.mode===scheme)} value={theme} onChange={applyTheme} labels className="w-full flex-wrap gap-x-4 gap-y-5" itemClassName="w-full" />
      </div>
      <div>
        <div className="mb-3 flex items-center gap-2 text-[13px] font-medium"><Waves className="size-4 text-muted-foreground" /> Background</div>
        <ScrollArea className={expanded?"background-gallery-scroll h-[430px]":"background-gallery-scroll h-[230px]"}><div className="background-gallery grid grid-cols-4 gap-3" role="group" aria-label="Background">
          {BACKGROUND_OPTIONS.map(o => {const bit=REACT_BITS_BACKGROUNDS.find(b=>b.value===o.value),palette=palettes[o.value as keyof typeof palettes];return <button key={o.value} aria-label={`Background: ${o.label}`} aria-pressed={ambience===o.value&&!custom.image} onClick={()=>setAmbience(o.value)} className="background-choice group min-w-0 self-start text-left"><span className={`ambience-swatch overflow-hidden ${ambience===o.value&&!custom.image?"is-selected":""}`} style={palette?{background:`linear-gradient(135deg,${palette[0]},${palette[2]} 55%,${palette[3]})`}:undefined}>{(bit||palette)&&<img src={bit?`/backgrounds/react-bits/${bit.slug}.jpg`:`/backgrounds/23rd/${o.value}.jpg`} alt="" loading="lazy" className="size-full object-cover"/>}{ambience===o.value&&!custom.image&&<span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-foreground text-background"><Check className="size-2.5"/></span>}</span><span className="background-choice-label mt-2 block text-xs text-muted-foreground group-hover:text-foreground" title={o.label}>{o.label}</span></button>})}

        </div></ScrollArea>
      </div>
      <section className="background-adjustments space-y-6"><h3 className="text-sm font-medium">Background controls</h3>
      <label className="background-animation-row flex w-full items-center justify-between gap-4 text-[13px]">
        <span>Animate background<span className="mt-1 block text-xs text-muted-foreground">Follows your reduced motion preference.</span></span>
        <Switch checked={animated} onCheckedChange={setAnimated} aria-label="Animate background" disabled={ambience === "off"} />
      </label>
      <div className="space-y-5">{([{key:"backgroundFade",label:"Background fade",max:100,unit:"%"},{key:"backgroundBlur",label:"Background blur",max:40,unit:"px"}] as const).map(control=><div className="space-y-3" key={control.key}><div className="flex items-center justify-between text-[13px]"><label id={control.key+"-label"}>{control.label}</label><output className="text-xs tabular-nums text-muted-foreground">{adjustment[control.key]}{control.unit}</output></div><Slider aria-label={control.label} aria-labelledby={control.key+"-label"} min={0} max={control.max} step={1} value={[adjustment[control.key]]} disabled={ambience==="off"&&!custom.image} onValueChange={([value])=>{setAdjustment(a=>({...a,[control.key]:value}));document.documentElement.style.setProperty(control.key==="backgroundBlur"?"--background-blur":"--background-mask",control.key==="backgroundBlur"?`${value}px`:value===0?"none":`linear-gradient(#000 ${100-value}%,transparent 100%)`);}} onValueCommit={([value])=>saveAppearance({...getAppearance(),[control.key]:value})}/></div>)}<div className="flex items-center justify-between gap-4"><div><p className="text-[13px]">Blur tint</p><p className="mt-1 text-xs text-muted-foreground">Color and opacity over the background</p></div><ColorPicker label="Background blur tint" value={custom.backgroundTint||custom.background||APP_THEMES.find(t=>t.value===theme)!.colors.panel} opacity={custom.backgroundTint?custom.backgroundTintOpacity:20} onChange={(backgroundTint,opacity)=>saveAppearance({...getAppearance(),backgroundTint,backgroundTintOpacity:opacity??20})}/></div></div>

      </section>
      <p className="text-[11px] text-muted-foreground">Backgrounds by <a href="https://www.23rd.dev/" target="_blank" rel="noreferrer" className="underline underline-offset-2">23rd</a> and <a href="https://reactbits.dev/" target="_blank" rel="noreferrer" className="underline underline-offset-2">React Bits</a>. Saved on this device.</p>
    </div>
  );
}

export function WorkspaceBackground() {
  const { ambience, animated, theme, custom } = useAppearance();
  const reduced = useReducedMotion();
  if (custom.image) return <div className="workspace-ambience workspace-image" aria-hidden="true"><img src={custom.image} alt="" /><div className="workspace-background-tint"/><div className="workspace-background-dither"/></div>;
  if (ambience === "off") return null;
  const moving=animated&&!reduced&&custom.backgroundOpacity>0;
  return <div className={`workspace-ambience ambience-${ambience}`} aria-hidden="true">
    {ambience.startsWith("rb-")?<ReactBitsBackground value={ambience as ReactBitsBackgroundId} animated={moving} light={isLightTheme(theme)}/>:<Suspense fallback={null}><ShaderGradient colors={palettes[ambience as Exclude<ClassicAmbience,"off">]} speed={moving ? .08 : 0} interactive={false} theme={isLightTheme(theme)?"light":"dark"} intensity={.55} grain={.2}/></Suspense>}
    <div className="workspace-background-tint"/><div className="workspace-background-dither"/>
  </div>;
}
