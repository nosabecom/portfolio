export const mergedDesigns = [
  {
    id: 'hybrid-pedestal', number: '01', owner: 'Arslan + Althea',
    name: 'Pedestal compound press', parts: 16, occurrences: 21,
    modelingLevel: 'Moderate–high', shapeWork: 'Moderate', assemblyWork: 'Moderate–high',
    modelingNotes: [
      'Arslan’s broad pedestal supports Althea’s basket, tray and guided compound lever. A 600 mm circular base and a tapered stand raise the collection tray by 150 mm; the post is extended to suit. The pressing plate keeps the same vertical path, with 163.5 mm of travel.',
      'Most added geometry is a circular extrusion or a revolved taper. The harder work is coordinating the link pivots, square guide and raised basket. The downloads contain editable parts and grounded open/pressed concept assemblies; adding native moving-joint relationships is the next assembly step.',
    ],
    preview: 'hybrid-pedestal/preview.webp', sketch: '',
    download: 'Pedestal_Compound_Press_Solid_Edge.zip', file: 'Pedestal_Compound_Press.asm',
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
