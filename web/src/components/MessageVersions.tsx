import {FilesChanged} from "./FilesChanged";
import {turnFileChanges,type FileChange} from "../lib/file-changes";
import {useEffect,useState} from "react";
import {MessageBranch,MessageBranchContent,MessageBranchItem,MessageBranchSelector,MessageBranchPrevious,MessageBranchNext,MessageBranchPage} from "./ui/message-branch";
import {AssistantTurn,buildResultMap,type AssistantViewProps} from "./Message";
import {Button} from "./ui/button";
import type{ReplyVersion}from"../lib/message-versions";
export function MessageVersions({versions,currentTimestamp,onContinue,files,...props}:Omit<AssistantViewProps,'message'>&{versions:ReplyVersion[];files?:FileChange[];currentTimestamp:any;onContinue:(id:string)=>void}){
 const initial=Math.max(0,versions.findIndex(v=>String(v.message.timestamp)===String(currentTimestamp))),[branch,setBranch]=useState(initial);
 useEffect(()=>setBranch(initial),[currentTimestamp]);
 return <MessageBranch branch={branch} onBranchChange={setBranch}><MessageBranchContent>{versions.map((v,i)=><MessageBranchItem key={v.id} id={v.id}><AssistantTurn {...props} message={v.message} results={{...props.results,...buildResultMap(v.messages)}} actions={i===initial?props.actions:{onCopy:props.actions?.onCopy}}/><FilesChanged files={i===initial?(files||[]):turnFileChanges(v.messages,v.messages.length-1,buildResultMap(v.messages))}/>{i!==initial&&<Button variant="outline" size="sm" className="mt-4 text-xs" onClick={()=>onContinue(v.id)}>Continue from this version</Button>}</MessageBranchItem>)}</MessageBranchContent><MessageBranchSelector className="mt-3"><MessageBranchPrevious/><MessageBranchPage/><MessageBranchNext/></MessageBranchSelector></MessageBranch>;
}
