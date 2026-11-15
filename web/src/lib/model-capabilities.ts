/** Require advertised priority support and a provider route that can realize it. */
export function supportsFastMode(model:any):boolean{
 if(!model||model.fastModeSupported===false||model.compat?.supportsServiceTier===false||model.compat?.supportsFastMode===false)return false;
 if(!Array.isArray(model.serviceTiers)||!model.serviceTiers.includes('priority'))return false;
 if(['fireworks','github-copilot'].includes(model.provider))return false;
 if(model.provider==='openrouter')return ['openai','gemini'].includes(model.identity?.class);
 if(model.api==='anthropic-messages')return model.provider==='anthropic';
 if(['openai','openai-codex','anthropic','google','google-vertex'].includes(model.provider))return true;
 return ['openai-completions','openai-responses'].includes(model.api)&&model.identity?.class==='openai';
}
