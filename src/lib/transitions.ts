// Short fades with a small vertical movement keep navigation calm.
const pair = {
  old: { name: 'content-out', duration: '160ms', easing: 'ease-in', fillMode: 'both' },
  new: { name: 'content-in', duration: '260ms', easing: 'ease-out', fillMode: 'both' },
};
export const contentTransition = { forwards: pair, backwards: pair };
