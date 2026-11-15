export const ICON_THEMES=[
 {value:'lucide',label:'Lucide',description:'Crisp, minimal strokes'},
 {value:'phosphor',label:'Phosphor',description:'Soft, expressive shapes'},
 {value:'tabler',label:'Tabler',description:'Precise, open outlines'},
 {value:'heroicons',label:'Heroicons',description:'Balanced, generous curves'},
 {value:'bootstrap',label:'Bootstrap',description:'Clean shapes with sturdy outlines'},
 {value:'remix',label:'Remix',description:'Compact, geometric lines'},
] as const;
export type IconThemeId=typeof ICON_THEMES[number]['value'];
