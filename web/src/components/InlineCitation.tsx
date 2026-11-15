import {HoverCard} from "radix-ui";
import type {ComponentProps} from "react";
/** User-supplied Inline Citation pattern. Previews only the link's known label and URL. */
export function InlineCitation({href,children,...props}:ComponentProps<'a'>){
 let host='';try{const url=new URL(href||'');if(!['http:','https:'].includes(url.protocol))return <a href={href} {...props}>{children}</a>;host=url.hostname.replace(/^www\./,'');}catch{return <a href={href} {...props}>{children}</a>;}
 return <HoverCard.Root openDelay={250} closeDelay={120}><HoverCard.Trigger asChild><a href={href} {...props} className="inline-citation" target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> · {host}</span></a></HoverCard.Trigger><HoverCard.Portal><HoverCard.Content sideOffset={8} collisionPadding={12} data-slot="hover-card-content" className="z-50 w-72 max-w-[calc(100vw-32px)] rounded-xl border p-4 text-sm text-foreground shadow-xl"><p className="font-medium">{children}</p><p className="mt-2 text-xs text-muted-foreground">{host}</p><p className="mt-1 break-all text-xs text-muted-foreground">{href}</p></HoverCard.Content></HoverCard.Portal></HoverCard.Root>;
}
