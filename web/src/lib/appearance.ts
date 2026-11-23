import {FILE_ICON_THEMES,type FileIconThemeId} from './file-icon-themes.ts';
import {updateFavicon} from "./favicon.ts";
import {ICON_THEMES,type IconThemeId} from './icon-themes.ts';
export const COLOR_KEYS = ["accent", "background", "foreground", "sidebar", "chatArea", "userMessages", "replies", "codeBlocks", "borders"] as const;
export type AppearanceColor = typeof COLOR_KEYS[number];
export const UI_FONTS = { geist: '"Geist", ui-sans-serif, system-ui, sans-serif', system: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', humanist: '"Trebuchet MS", "Segoe UI", sans-serif' };
export const CODE_FONTS = { geist: '"Geist Mono", ui-monospace, monospace', system: '"Cascadia Code", Menlo, Consolas, monospace' };
export const HEADING_FONTS = { inherit: 'var(--workspace-ui-font)', system: UI_FONTS.system, serif: 'Georgia, "Times New Roman", serif' };
export type CustomAppearance = Partial<Record<AppearanceColor, string>> & { backgroundFade:number; backgroundBlur:number; backgroundTint?:string; backgroundTintOpacity:number; backgroundOpacity:number; scale: number; glass: boolean; glassCards:boolean; translucentSidebar: boolean; icons: IconThemeId; fileIcons:FileIconThemeId; image: string; contrast: "standard" | "high"; uiFont: keyof typeof UI_FONTS; codeFont: keyof typeof CODE_FONTS; headingFont: keyof typeof HEADING_FONTS; chatSize: number; lineHeight: number; radius: number; shadow: "none" | "soft" | "deep" };
export const APPEARANCE_KEY = "ompfe.custom-appearance";
export const DEFAULT_APPEARANCE: CustomAppearance = { backgroundFade:85,backgroundBlur:0,backgroundTintOpacity:0,backgroundOpacity:25, scale: 100, glass: true, glassCards:false, translucentSidebar: false, icons: "lucide", fileIcons:"material", image: "", contrast: "standard", uiFont: "geist", codeFont: "geist", headingFont: "inherit", chatSize: 14, lineHeight: 1.7, radius: 18, shadow: "soft" };
export function validateAppearance(input: any): CustomAppearance {
 if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Choose a valid theme JSON file");
 const result = {...DEFAULT_APPEARANCE};
 for(const [key,max]of [["backgroundFade",100],["backgroundBlur",40],["backgroundTintOpacity",100]] as const){if(input[key]!==undefined){if(typeof input[key]!=="number"||!Number.isFinite(input[key])||input[key]<0||input[key]>max)throw Error(`Invalid ${key}`);result[key]=input[key];}}
 if(input.backgroundTint!==undefined){if(!/^#[0-9a-f]{6}$/i.test(input.backgroundTint))throw Error("Invalid background tint");result.backgroundTint=input.backgroundTint;}
 if(input.backgroundOpacity!==undefined){if(typeof input.backgroundOpacity!=="number"||!Number.isFinite(input.backgroundOpacity)||input.backgroundOpacity<0||input.backgroundOpacity>100)throw Error("Background visibility must be between 0 and 100");result.backgroundOpacity=input.backgroundOpacity;}
 for (const key of COLOR_KEYS) { if (input[key] !== undefined && !/^#[0-9a-f]{6}$/i.test(input[key])) throw Error(`Invalid ${key} color`); if (input[key]) result[key] = input[key]; }
 for (const [key, choices] of Object.entries({scale:[85,90,100,110,120], icons:ICON_THEMES.map(set=>set.value), fileIcons:FILE_ICON_THEMES.map(set=>set.value), contrast:["standard","high"], uiFont:Object.keys(UI_FONTS), codeFont:Object.keys(CODE_FONTS), headingFont:Object.keys(HEADING_FONTS), chatSize:[12,13,14,15,16,18], lineHeight:[1.4,1.5,1.6,1.7,1.8,2], radius:[8,12,18,24], shadow:["none","soft","deep"]})) {
   if (input[key] !== undefined) { if (!(choices as any[]).includes(input[key])) throw Error(`Unsupported ${key}`); (result as any)[key] = input[key]; }
 }
 for (const key of ["glass","glassCards","translucentSidebar"] as const) { if (input[key] !== undefined && typeof input[key] !== "boolean") throw Error(`Invalid ${key} option`); result[key] = input[key] ?? DEFAULT_APPEARANCE[key]; }
 if (input.image && !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(input.image)) throw Error("Background must be a PNG, JPEG, or WebP image");
 if ((input.image?.length || 0) > 3_000_000) throw Error("Background image is too large");
 result.image = input.image || ""; return result;
}
export function getAppearance(): CustomAppearance {try{return validateAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY)||"{}"));}catch{return {...DEFAULT_APPEARANCE};}}
export function applyCustomAppearance() {
 const a=getAppearance(), root=document.documentElement;
 root.style.setProperty("--background-opacity",String(a.backgroundOpacity/100));
 root.style.setProperty("--background-blur",`${a.backgroundBlur}px`);
 root.style.setProperty("--background-fade",String(a.backgroundFade));
 root.style.setProperty("--background-tint",a.backgroundTint||"var(--background)");
 root.style.setProperty("--background-tint-opacity",String(a.backgroundTint?a.backgroundTintOpacity/100:0));
 root.style.setProperty("--background-mask",a.backgroundFade===0?"none":`linear-gradient(#000 ${100-a.backgroundFade}%, transparent 100%)`);
 for (const key of COLOR_KEYS) { if (a[key]) root.style.setProperty(`--custom-${key}`, a[key]!); else root.style.removeProperty(`--custom-${key}`); }
 // Remove legacy direct overrides from earlier versions of the theme editor.
 for(const key of ["--primary","--accent-color","--ring","--sidebar-primary","--chart-1","--background","--canvas","--foreground","--text-strong","--fog-100","--card-foreground","--popover-foreground","--sidebar-foreground"])root.style.removeProperty(key);
 root.style.setProperty("--workspace-ui-font",UI_FONTS[a.uiFont]); root.style.setProperty("--workspace-code-font",CODE_FONTS[a.codeFont]); root.style.setProperty("--workspace-heading-font",HEADING_FONTS[a.headingFont]);
 root.style.setProperty("--chat-text-size",`${a.chatSize}px`); root.style.setProperty("--chat-line-height",String(a.lineHeight)); root.style.setProperty("--workspace-radius",`${a.radius}px`);
 root.style.setProperty("--workspace-shadow",a.shadow==="none"?"none":a.shadow==="deep"?"0 20px 64px #0005":"0 8px 28px #0002");
 updateFavicon(a.accent||root.style.getPropertyValue("--theme-accent")||"#ff5f2e");
 root.style.setProperty("zoom",String(a.scale/100)); root.dataset.glass=String(a.glass);root.dataset.cardGlass=String(a.glassCards); root.dataset.sidebarGlass=String(a.translucentSidebar); root.dataset.icons=a.icons;root.dataset.fileIcons=a.fileIcons; root.dataset.contrast=a.contrast;
}
export function saveAppearance(a:CustomAppearance) {const validated=validateAppearance(a);localStorage.setItem(APPEARANCE_KEY,JSON.stringify(validated));applyCustomAppearance();window.dispatchEvent(new Event("omp:appearance"));}

