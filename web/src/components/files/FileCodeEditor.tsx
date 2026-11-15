import {useEffect,useRef} from 'react';
import {EditorView,keymap} from '@codemirror/view';
import {EditorState,Compartment,Text} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {HighlightStyle,syntaxHighlighting} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {javascript} from '@codemirror/lang-javascript';
import {json} from '@codemirror/lang-json';
import {cpp} from '@codemirror/lang-cpp';
import {css} from '@codemirror/lang-css';
import {html} from '@codemirror/lang-html';
import {markdown} from '@codemirror/lang-markdown';
import {fileName,type EditorDocument} from '../../lib/editor-session';
function language(file:string){const ext=file.split('.').pop()?.toLowerCase();return ['js','jsx','ts','tsx','mjs'].includes(ext||'')?javascript({typescript:ext==='ts'||ext==='tsx',jsx:ext==='jsx'||ext==='tsx'}):ext==='json'?json():['c','cpp','h','hpp','cc'].includes(ext||'')?cpp():ext==='css'?css():ext==='html'?html():ext==='md'?markdown():[];}
function theme(){const dark=document.documentElement.classList.contains('dark');return [syntaxHighlighting(HighlightStyle.define([{tag:tags.keyword,color:dark?'#b4a5df':'#6b418d'},{tag:[tags.string,tags.special(tags.string)],color:dark?'#a8c99b':'#386c32'},{tag:tags.comment,color:dark?'#858990':'#73767d',fontStyle:'italic'},{tag:[tags.number,tags.bool],color:dark?'#d8b990':'#845813'},{tag:[tags.function(tags.variableName),tags.typeName],color:dark?'#91b7d4':'#275c82'},{tag:[tags.meta,tags.processingInstruction],color:dark?'#b4bdc5':'#59646e'}])),EditorView.theme({'&':{height:'100%',backgroundColor:'transparent',color:'var(--foreground)'},'.cm-scroller':{fontFamily:'var(--font-mono)',fontSize:'13px',lineHeight:'1.7',overflow:'auto'},'.cm-content':{padding:'16px 0'},'.cm-gutters':{backgroundColor:'transparent',color:'var(--muted-foreground)',border:'none'},'.cm-activeLine,.cm-activeLineGutter':{backgroundColor:'color-mix(in srgb,var(--foreground) 4%,transparent)'},'.cm-cursor':{borderLeftColor:'var(--primary)'},'.cm-selectionBackground':{backgroundColor:'color-mix(in srgb,var(--primary) 25%,transparent) !important'},'.cm-panels':{backgroundColor:'var(--sidebar)',color:'var(--foreground)'},'.cm-tooltip':{backgroundColor:'var(--popover)',color:'var(--popover-foreground)',borderColor:'var(--border)'}},{dark})];}
export function FileCodeEditor({document:doc,active,onChange,onSave,onCursor}:{document:EditorDocument;active:boolean;onChange:(content:string)=>void;onSave:()=>void;onCursor:(line:number,column:number)=>void}){
 const host=useRef<HTMLDivElement>(null),view=useRef<EditorView|null>(null),callbacks=useRef({onChange,onSave,onCursor});callbacks.current={onChange,onSave,onCursor};
 useEffect(()=>{if(!host.current)return;const appearance=new Compartment();const editor=new EditorView({parent:host.current,state:EditorState.create({doc:Text.of(doc.content.split(/\r\n|\r|\n/)),extensions:[basicSetup,language(doc.path),appearance.of(theme()),EditorState.lineSeparator.of(doc.content.includes('\r\n')?'\r\n':'\n'),EditorView.contentAttributes.of({'aria-label':'Code editor: '+fileName(doc.path)}),keymap.of([{key:'Mod-s',run:()=>{callbacks.current.onSave();return true;}}]),EditorView.updateListener.of(update=>{if(update.docChanged)callbacks.current.onChange(update.state.sliceDoc());if(update.selectionSet||update.docChanged){const position=update.state.selection.main.head,line=update.state.doc.lineAt(position);callbacks.current.onCursor(line.number,position-line.from+1);}})]})});view.current=editor;
 const observer=new MutationObserver(()=>editor.dispatch({effects:appearance.reconfigure(theme())}));observer.observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
 return()=>{observer.disconnect();editor.destroy();view.current=null;};},[doc.path,doc.generation]);
 useEffect(()=>{if(active&&view.current){view.current.requestMeasure();const state=view.current.state,position=state.selection.main.head,line=state.doc.lineAt(position);callbacks.current.onCursor(line.number,position-line.from+1);}},[active]);
 return <div role="tabpanel" id={'editor-'+encodeURIComponent(doc.path)} aria-label={fileName(doc.path)} hidden={!active} className="file-editor-content"><div ref={host} className="h-full"/></div>;
}
