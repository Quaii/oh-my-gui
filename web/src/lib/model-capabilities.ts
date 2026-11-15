/** Match OMP's advertised model tiers; unknown models do not gain a Fast toggle. */
export function supportsFastMode(model:any):boolean{return Array.isArray(model?.serviceTiers)&&model.serviceTiers.includes('priority');}
