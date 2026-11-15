export const APPROVAL_MODES = [
  {value:'always-ask',label:'Ask before changes',description:'Read files freely. Ask before edits and commands.'},
  {value:'always-ask-cached',label:'Ask and remember',description:'Ask before new file reads, edits, and commands. Remember approved targets.'},
  {value:'write',label:'Allow edits',description:'Read and edit workspace files. Ask before commands and other execution.'},
  {value:'yolo',label:'Full access',description:'Auto-approve reads, edits, and execution. Explicit tool restrictions still apply.'},
] as const;
export type ApprovalMode = typeof APPROVAL_MODES[number]['value'];
export function approvalMode(value:unknown):ApprovalMode|null{return APPROVAL_MODES.some(m=>m.value===value)?value as ApprovalMode:null;}
export function approvalLaunchOverride(flags:string[]):ApprovalMode|null{
  if(flags.some(f=>f==='--yolo'||f==='--auto-approve'))return 'yolo';
  let result:ApprovalMode|null=null;
  for(let i=0;i<flags.length;i++){
    if(flags[i]==='--approval-mode')result=approvalMode(flags[++i]);
    else if(flags[i].startsWith('--approval-mode='))result=approvalMode(flags[i].slice(16));
  }
  return result;
}
