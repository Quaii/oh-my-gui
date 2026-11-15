import {Marked}from'marked';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const safe=(href:string)=>/^(https?:|mailto:|\/|#)/i.test(href);
const parser=new Marked({gfm:true,breaks:true,renderer:{
 html({text}){return escape(text);},
 link({href,tokens,title}){const label=this.parser.parseInline(tokens);return safe(href)?'<a href="'+escape(href)+'" target="_blank" rel="noopener noreferrer"'+(title?' title="'+escape(title)+'"':'')+'>'+label+'</a>':label;},
 image({href,text,title}){return /^(https?:|\/|data:image\/(?:png|jpeg|webp);base64,)/i.test(href)?'<img src="'+escape(href)+'" alt="'+escape(text)+'"'+(title?' title="'+escape(title)+'"':'')+' loading="lazy"/>':escape(text);}
}});
export function renderMarkdown(text:string):string{try{return parser.parse(text||'',{async:false}) as string;}catch{return escape(text||'');}}
