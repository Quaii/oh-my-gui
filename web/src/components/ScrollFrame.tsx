import type {ReactNode} from 'react';
/** A neutral scroll layout frame. Blur belongs behind floating controls, not list edges. */
export function ScrollFrame({children,className=''}:{children:ReactNode;className?:string}){return <div className={'relative min-h-0 '+className}>{children}</div>;}
