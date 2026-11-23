import {useState,type ComponentProps,type CSSProperties} from 'react';
import './amicro.css';

/** Amicro ApplePulseDots/FadeDots/BouncingDots/ConcentricPulse, adapted to currentColor and CSS.
 * MIT, SYED SUBHAN UDDIN. Upstream revision and license: ASSET-CREDITS.md / public/licenses/amicro.txt.
 * Choose once per loading episode, never on every render or elapsed-time tick. */
export function LoadingIndicator({className='',variant:requested,...props}:ComponentProps<'span'>&{variant?:'pulse'|'fade'|'bounce'|'ripple'}) {
  const [chosen]=useState(()=>['pulse','fade','bounce','ripple'][Math.floor(Math.random()*4)]);
  const variant=requested||chosen;
  return <span {...props} role={props['aria-hidden']?undefined:'status'} aria-label={props['aria-label']||'Loading'}
    className={`amicro-loader ${className.replace(/\banimate-spin\b/g,'')}`} data-variant={variant}>
    {[0,1,2].map(i=><span key={i} style={{'--dot-index':i} as CSSProperties}/>)}
  </span>;
}
