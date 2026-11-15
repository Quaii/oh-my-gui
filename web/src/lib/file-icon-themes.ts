export const FILE_ICON_THEMES=[
  {value:'material',label:'Material',description:'Original file-type colors'},
  {value:'monochrome',label:'Monochrome',description:'Material shapes in the interface color'},
  {value:'minimal',label:'Minimal',description:'Simple outlines by file category'},
] as const;
export type FileIconThemeId=typeof FILE_ICON_THEMES[number]['value'];
