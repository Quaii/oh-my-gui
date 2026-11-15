import {useState,lazy,Suspense} from 'react';
import {createPortal} from 'react-dom';
import {FileCodeEditor} from './FileCodeEditor';
import {Tabs,TabsList,TabsTrigger} from '../transitions/tabs';
import type {EditorDocument} from '../../lib/editor-session';
import {visualMarkdownIssue} from '../../lib/markdown-editor';
const VisualMarkdown=lazy(()=>import('./VisualMarkdown'));
type Props={modeHost?:HTMLElement|null;document:EditorDocument;active:boolean;onChange:(text:string)=>void;onSave:()=>void;onCursor:(line:number,column:number)=>void};

export function FileDocument(p:Props){const markdown=/\.(md|markdown)$/i.test(p.document.path),[mode,setMode]=useState('source'),[opened,setOpened]=useState(false),issue=visualMarkdownIssue(p.document.content);if(!markdown)return <FileCodeEditor {...p}/>;
 return <div className="markdown-document" hidden={!p.active}>{p.active&&p.modeHost&&createPortal(<Tabs value={mode} onValueChange={next=>{setMode(next);if(next==='visual')setOpened(true);}} className="markdown-mode-switch"><TabsList aria-label="Markdown editing mode"><TabsTrigger value="source">Source</TabsTrigger><TabsTrigger value="visual" disabled={!!issue} title={issue||undefined}>Visual</TabsTrigger></TabsList>{issue&&<p className="text-xs text-muted-foreground">{issue}</p>}</Tabs>,p.modeHost)}<div className="markdown-source" hidden={mode!=='source'}><FileCodeEditor {...p} active={p.active&&mode==='source'}/></div>{opened&&<div className="markdown-rich" hidden={mode!=='visual'}><Suspense fallback={<p role="status" className="p-5 text-sm text-muted-foreground">Loading visual editor…</p>}><VisualMarkdown {...p}/></Suspense></div>}</div>;
}
