import {useEffect,useRef,useState} from 'react';
import {useEditor} from '@tiptap/react';
import {StarterKit} from '@tiptap/starter-kit';
import {Markdown} from '@tiptap/markdown';
import {TableKit} from '@tiptap/extension-table';
import {TaskList} from '@tiptap/extension-task-list';
import {TaskItem} from '@tiptap/extension-task-item';
import {Image} from '@tiptap/extension-image';
import {RichTextEditor} from '@editorcn/editor';
import {fileName,type EditorDocument} from '../../lib/editor-session';

import {preserveMarkdownEol} from '../../lib/markdown-editor';
type Props={document:EditorDocument;active:boolean;onChange:(text:string)=>void;onSave:()=>void;onCursor:(line:number,column:number)=>void};
export default function VisualMarkdown(p:Props){const current=useRef(p);current.current=p;const editor=useEditor({immediatelyRender:false,shouldRerenderOnTransaction:false,extensions:[StarterKit.configure({link:{openOnClick:false}}),Markdown,TableKit,TaskList,TaskItem.configure({nested:true}),Image],content:p.document.content,contentType:'markdown',editorProps:{attributes:{'aria-label':'Visual Markdown: '+fileName(p.document.path),role:'textbox','aria-multiline':'true'},handleKeyDown:(_,event)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();current.current.onSave();return true;}return false;}},onUpdate:({editor})=>current.current.onChange(preserveMarkdownEol(editor.getMarkdown(),current.current.document.savedContent))});
 useEffect(()=>{if(editor&&editor.getMarkdown().replace(/\r\n/g,'\n')!==p.document.content.replace(/\r\n/g,'\n'))editor.commands.setContent(p.document.content,{contentType:'markdown',emitUpdate:false});},[editor,p.document.content]);
 return <RichTextEditor editor={editor} className="markdown-visual"><RichTextEditor.Toolbar><RichTextEditor.ControlsGroup><RichTextEditor.Bold/><RichTextEditor.Italic/><RichTextEditor.Strikethrough/><RichTextEditor.Code/></RichTextEditor.ControlsGroup><RichTextEditor.ControlsGroup><RichTextEditor.H1/><RichTextEditor.H2/><RichTextEditor.BulletList/><RichTextEditor.OrderedList/><RichTextEditor.Blockquote/></RichTextEditor.ControlsGroup><RichTextEditor.ControlsGroup><RichTextEditor.Undo/><RichTextEditor.Redo/></RichTextEditor.ControlsGroup></RichTextEditor.Toolbar><RichTextEditor.Content/></RichTextEditor>;
}
