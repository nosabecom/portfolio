export const mergedDesigns = [
  {
    id: 'hybrid-pedestal', number: '01', owner: 'Arslan + Althea',
    revision: 'Rev 4', removableBowl: true,
    name: 'Suspended basket press', parts: 15, occurrences: 20,
    modelingLevel: 'Moderate–high', shapeWork: 'Moderate', assemblyWork: 'Moderate–high',
    modelingNotes: [
      'The head presses into a perforated fruit basket held up by the rear frame. Juice falls straight down into the separate 320 mm collection bowl underneath. Pull out the lower bowl by its handles; the basket stays suspended.',
      'Moderate–high: revolve the bowl and basket, model the fixed support arm and locating ring, then align the lever, links and ram. Check the 163 mm pressing stroke and bowl removal clearance. Viewer motion uses solved Solid Edge positions.',
    ],
    preview: 'hybrid-pedestal/preview.webp', sketch: '',
    download: 'Arslan_Althea_Suspended_Strainer_Rev4.zip', file: 'Suspended_Strainer_Bowl_Press_Rev4.asm',
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
