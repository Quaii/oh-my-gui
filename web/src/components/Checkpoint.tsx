import {Marker,MarkerContent} from "./ui/marker";
// User-supplied shadcn.io Marker + Button checkpoint pattern, backed by OMP's tree.
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
export function Checkpoint({label,onRestore,disabled}:{label:string;onRestore:()=>void;disabled:boolean}){return <Marker variant="separator" className="checkpoint my-6 text-xs"><MarkerContent className="flex items-center gap-3"><span>{label}</span><Tooltip><TooltipTrigger asChild><Button variant="outline" size="xs" disabled={disabled} onClick={onRestore} aria-label={`Restore chat to ${label}`}>Restore chat</Button></TooltipTrigger><TooltipContent>Returns to this conversation branch. Files on disk are unchanged.</TooltipContent></Tooltip></MarkerContent></Marker>}
