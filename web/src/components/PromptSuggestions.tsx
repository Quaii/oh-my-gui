// User-supplied Suggestion pattern: plain outline buttons, no wrapper API or mock answers.
import {Button} from "@/components/ui/button";
export function PromptSuggestions({prompts,onSelect,disabled=false}:{prompts:string[];onSelect:(prompt:string)=>void;disabled?:boolean}){
 return <div className="prompt-suggestions flex w-full flex-wrap gap-2" aria-label="Prompt suggestions">{prompts.map(prompt=><Button key={prompt} variant="ghost" size="sm" disabled={disabled} className="floating-suggestion h-auto max-w-full whitespace-normal py-2 text-left text-xs font-normal" onClick={()=>onSelect(prompt)}>{prompt}</Button>)}</div>;
}
