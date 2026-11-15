// User-supplied Suggestion pattern: plain outline buttons, no wrapper API or mock answers.
import {Button} from "@/components/ui/button";
import {HorizontalCarousel} from './HorizontalCarousel';
export function PromptSuggestions({prompts,onSelect,disabled=false}:{prompts:string[];onSelect:(prompt:string)=>void;disabled?:boolean}){
 return <HorizontalCarousel className="prompt-suggestions" label="Prompt suggestions">{prompts.map(prompt=><Button key={prompt} variant="ghost" size="sm" disabled={disabled} className="floating-suggestion h-auto shrink-0 whitespace-nowrap py-2 text-left text-xs font-normal" onClick={()=>onSelect(prompt)}>{prompt}</Button>)}</HorizontalCarousel>;
}
