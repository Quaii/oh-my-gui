/** Same path as Brand. Updating the SVG data URL keeps the tab aligned with the workspace accent. */
import {syncDesktopAccent} from "./desktop.ts";
export function updateFavicon(color:string){
 if(!/^#[0-9a-f]{6}$/i.test(color))return;
 syncDesktopAccent(color);
 const icon=document.querySelector<HTMLLinkElement>('link[rel="icon"]');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M6 9v14M12.5 5v22M19 9v14M25.5 12v8" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/></svg>`;
 if(icon)icon.href=`data:image/svg+xml,${encodeURIComponent(svg)}`;
}
