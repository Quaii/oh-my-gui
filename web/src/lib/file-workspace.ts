import {createContext,useContext} from 'react';
export const FileOpenContext=createContext<(path:string)=>void>(()=>{});
export const useOpenFile=()=>useContext(FileOpenContext);
