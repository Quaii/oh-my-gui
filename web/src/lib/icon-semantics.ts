export const TOOL_ICON_NAMES={read:'FileText',write:'FilePlus2',edit:'FilePenLine',ast_edit:'CodeXml',bash:'Terminal',powershell:'TerminalSquare',grep:'TextSearch',glob:'FolderSearch',find:'FileSearch',eval:'Braces',task:'Network',wait:'Timer',todo:'ListTodo',ask:'MessageCircle',web_search:'Globe',web_fetch:'Download',lsp:'Waypoints',debug:'Bug',ida:'Binary',ast_grep:'SearchCode',github:'Github',checkpoint:'BookmarkCheck',rewind:'History',context_notes:'NotebookPen',new_context:'Files',retain:'Archive',recall:'ScanSearch',reflect:'Brain',memory_edit:'NotebookPen',learn:'GraduationCap',manage_skill:'BookOpenCheck',security_scan:'ShieldCheck',codemode:'SquareCode',tool_search:'Search'} as const;
export const TOOL_SETTING_ICON_NAMES={
 'tools.restrictedFolders':'FolderLock','tools.approval':'ShieldCheck','tools.approvalMode':'ShieldQuestion',
 'tools.xdev':'PlugZap','tools.xdevDocs':'BookOpen','tools.xdevInlineDevices':'ListFilter','tools.xdevNotices':'Bell',
 'tools.abortOnFabricatedResult':'ShieldAlert','tools.intentTracing':'Route','tools.format':'Braces',
 'tools.speculativeExecution.enabled':'FastForward','tools.speculativeExecution.maxInFlight':'Layers',
 'tools.maxTimeout':'Timer','tools.artifactSpillThreshold':'ArrowDownToLine','tools.artifactHeadBytes':'PanelTop','tools.artifactTailBytes':'PanelBottom','tools.artifactHeadLines':'ListStart','tools.artifactTailLines':'ListEnd','tools.artifactMaxBytes':'Archive','tools.outputMaxColumns':'Columns3'
} as const;
export function toolIconName(name:string){return TOOL_ICON_NAMES[name as keyof typeof TOOL_ICON_NAMES]||'Wrench';}
export function toolSettingIconName(key:string):string|undefined{
 return TOOL_SETTING_ICON_NAMES[key as keyof typeof TOOL_SETTING_ICON_NAMES]||(key.endsWith('.enabled')?TOOL_ICON_NAMES[key.split('.')[0] as keyof typeof TOOL_ICON_NAMES]:undefined);
}
