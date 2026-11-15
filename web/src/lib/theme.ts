import { applyCustomAppearance } from "./appearance";
import type { ThemeOption } from "@/components/ui/theme-selector";
export const LS_THEME = "ompfe.theme";
type WorkspaceTheme = ThemeOption & {mode:"light"|"dark";foreground:string;subtle:string};
function theme(value:string,label:string,mode:"light"|"dark",sidebar:string,panel:string,tile:string,border:string,strong:string,foreground:string,subtle:string):WorkspaceTheme {return {value,label,mode,foreground,subtle,colors:{sidebar,panel,tile,border,strong,muted:tile}};}
export const APP_THEMES:WorkspaceTheme[] = [
 theme("dark","Graphite","dark","#1c1c1e","#111112","#232326","#343438","#ff5f2e","#f0f0f3","#a3a3ad"),
 theme("slate","Midnight","dark","#0e1118","#131821","#222b3a","#303b4d","#a8b5ff","#e9edf6","#9da9bf"),
 theme("forest","Forest","dark","#151e1b","#101815","#202e27","#34453b","#9cbe9c","#e5eee6","#a0b3a6"),
 theme("plum","Plum","dark","#211c26","#18141d","#2e2735","#44394c","#d1a8cd","#f0e9f2","#b8a7be"),
 theme("espresso","Espresso","dark","#231e1b","#191613","#302823","#493d33","#d7b18e","#f1e8df","#b9a99b"),
 theme("carbon","Carbon","dark","#181818","#0b0b0b","#242424","#363636","#bfcbd4","#f3f3f3","#aaaeb2"),
 theme("daylight","Paper","light","#f1f3f6","#ffffff","#f5f6f8","#dce1e8","#906300","#20242c","#606975"),
 theme("linen","Linen","light","#eeeae5","#faf8f4","#f2ede6","#ded7cf","#a84b2f","#302923","#766b61"),
 theme("sage","Sage","light","#e7ede5","#f6f8f2","#ecf0e7","#d1dbcc","#426f4d","#233026","#617161"),
 theme("mist","Mist","light","#e7edf4","#f7f9fc","#edf2f8","#d1dce9","#4a6d9b","#243247","#65758a"),
 theme("rose","Rose","light","#f0e6e8","#fcf7f7","#f5ecee","#e4d3d8","#9d5068","#38282d","#806a72"),
 theme("sand","Sand","light","#eee8d9","#fbf8ee","#f4efdf","#e1d7be","#846626","#373022","#7d725b"),
];
export const DEFAULT_THEME="dark";
export function getTheme():string {try{const v=localStorage.getItem(LS_THEME);return APP_THEMES.some(t=>t.value===v)?v!:DEFAULT_THEME;}catch{return DEFAULT_THEME;}}
export function isLightTheme(value:string) {return APP_THEMES.find(t=>t.value===value)?.mode==="light";}
let transitionTheme:((value:string)=>void)|undefined;
export function registerThemeTransition(handler:(value:string)=>void){transitionTheme=handler;return()=>{if(transitionTheme===handler)transitionTheme=undefined;};}
export function applyTheme(value:string){if(transitionTheme&&value!==getTheme())transitionTheme(value);else applyThemeImmediately(value);}
export function applyThemeImmediately(value:string) {
 const t=APP_THEMES.find(t=>t.value===value)||APP_THEMES[0], root=document.documentElement,c=t.colors;
 root.dataset.theme=t.value;root.classList.toggle("dark",t.mode==="dark");root.style.colorScheme=t.mode;
 const vars:Record<string,string>={"--theme-background":c.panel,"--theme-foreground":t.foreground,"--theme-sidebar":c.sidebar,"--theme-card":c.tile,"--theme-border":c.border,"--theme-accent":c.strong,"--theme-muted":t.subtle};
 for(const[k,v]of Object.entries(vars))root.style.setProperty(k,v);
 try{localStorage.setItem(LS_THEME,t.value);}catch{}
 applyCustomAppearance();window.dispatchEvent(new Event("omp:appearance"));
}
