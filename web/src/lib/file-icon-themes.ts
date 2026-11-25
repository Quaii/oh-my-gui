export const FILE_ICON_THEMES=[
  {value:'material',label:'Material',description:'Original file-type colors'},
  {value:'monochrome',label:'Monochrome',description:'Material shapes in the interface color'},
  {value:'minimal',label:'Minimal',description:'Simple outlines by file category'},
  {value:'tabler',label:'Tabler',description:'Geometric file outlines'},
  {value:'heroicons',label:'Heroicons',description:'Solid file and media symbols'},
  {value:'phosphor',label:'Phosphor',description:'Rounded duotone file icons'},
] as const;
export type FileIconThemeId=typeof FILE_ICON_THEMES[number]['value'];
