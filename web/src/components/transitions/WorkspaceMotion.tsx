import {ViewTransition,type ReactNode,useEffect} from 'react';
import {flushSync} from 'react-dom';
import {tk} from './ui-transition';
import {applyThemeImmediately,registerThemeTransition} from '../../lib/theme';
/** transition-kit boundaries animate deliberate UI changes, never streaming text. */
export function LayoutMotion({children}:{children:ReactNode}){return <ViewTransition default="none" update={tk('tk-morph','tk-clip','tk-text')} enter={tk('tk-fade')} exit={tk('tk-fade')}>{children}</ViewTransition>;}
/** Native adapter for transition-kit's theme fade, retaining all workspace themes. */
export function WorkspaceMotion({children}:{children:ReactNode}){useEffect(()=>registerThemeTransition(value=>{const update=()=>flushSync(()=>applyThemeImmediately(value));if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!document.startViewTransition){update();return;}document.documentElement.dataset.themeTransition='true';const transition=document.startViewTransition(update);void transition.ready.catch(()=>{});void transition.finished.catch(()=>{}).finally(()=>{delete document.documentElement.dataset.themeTransition;});}),[]);return <div className="workspace-motion-root">{children}</div>;}
