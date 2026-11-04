export const mergedDesigns = [
  {
    id: 'hybrid-pedestal', number: '01', owner: 'Arslan + Althea',
    revision: 'Rev 3', removableBowl: true,
    name: 'Suspended bowl press', parts: 14, occurrences: 19,
    modelingLevel: 'Moderate–high', shapeWork: 'Moderate', assemblyWork: 'Moderate–high',
    modelingNotes: [
      'The lever and guided head hang above a large removable bowl. A perforated strainer sits on the bowl rim, so juice drains straight down. The 320 mm collection bowl has two grab handles and lifts out with the strainer for emptying and cleaning.',
      'Moderate–high: revolve the curved bowl, add the handles and strainer flange, then align the linkage and vertical ram. The main checks are head clearance through the 163 mm stroke and enough room to lift the bowl before pulling it forward. Native Solid Edge motion is included.',
    ],
    preview: 'hybrid-pedestal/preview.webp', sketch: '',
    download: 'Arslan_Althea_Removable_Bowl_Rev3.zip', file: 'Suspended_Lever_Bowl_Press_Rev3.asm',
  },
  {
    id: 'hybrid-geared-jar', number: '02', owner: 'Nosa + Lyle',
    name: 'Geared berry press', parts: 19, occurrences: 22,
    modelingLevel: 'Hardest', shapeWork: 'High', assemblyWork: 'High',
    modelingNotes: [
      'Nosa’s 20/60-tooth drive moves Lyle’s pressing lid over a removable strainer and collection jar. The lid and collar threads are removed so the lid slides vertically. A guide beside the jar keeps it from rotating, and the raised lid leaves the berry inlet open.',
      'The drive uses quarter-scale linked copies, with editable source parts included. The screw thread is modeled; the nut has a simplified internal bore. A nominal 1.5 mm lead and 3:1 reduction give 0.5 mm per handle turn: 74 mm takes 148 turns. Gear alignment, guide clearance and native motion coupling make this the harder merge. Downloads contain grounded open/pressed concept assemblies.',
    ],
    openLabel: 'Load berries',
    preview: 'hybrid-geared-jar/preview.webp', sketch: '',
    download: 'Geared_Berry_Press_Solid_Edge.zip', file: 'Geared_Berry_Press.asm',
  },
];
