/** Keep source-only syntax intact rather than silently stripping it in a rich editor. */
export function visualMarkdownIssue(source:string):string|null{if(/^---\r?\n/.test(source))return 'This file contains frontmatter. Use Source to preserve it.';if(/<!--|^\s*<\/?[a-z][\w-]*(?:\s|>|\/)/im.test(source))return 'This file contains HTML. Use Source to preserve it.';return null;}
export function preserveMarkdownEol(value:string,original:string){const lf=value.replace(/\r\n/g,'\n');return original.includes('\r\n')?lf.replace(/\n/g,'\r\n'):lf;}
