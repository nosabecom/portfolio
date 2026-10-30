const clamp = (n: number) => Math.max(0, Math.min(1, n));
// Zero velocity and acceleration at both ends keep the light from snapping on/off.
const smooth = (n: number) => { const t = clamp(n); return t * t * t * (t * (t * 6 - 15) + 10); };

export const INTRO_DURATION = 3000;

/** Continuous light values, independent of the interaction glyphs' opacity steps. */
export function introLight(progress: number) {
  const phase = clamp(progress / .64);
  return {
    revealed: smooth(phase),
    glow: Math.sin(phase * Math.PI) ** 2,
  };
}

/** The field owns drawing; this controller owns timing and foreground reveals. */
export function mountLagosIntro(
  root: HTMLElement,
  render: (progress: number) => void,
  restore: () => void,
) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const demo = root.querySelector<HTMLElement>('.intro-demo');
  const params = new URLSearchParams(location.search);
  let frame = 0, playing = false;
  let animations: Animation[] = [];

  function finish() {
    cancelAnimationFrame(frame);
    frame = 0;
    for (const animation of animations) animation.cancel();
    animations = [];
    if (playing) restore();
    playing = false;
    delete root.dataset.introPlaying;
    root.style.removeProperty('--intro-shade');
    document.documentElement.removeAttribute('data-intro-pending');
  }

  function play() {
    finish();
    if (motion.matches || document.hidden) return;
    playing = true;
    root.dataset.introPlaying = 'true';
    root.style.setProperty('--intro-shade', '0');
    const reveals: [Element | null, number][] = [
      [root.querySelector('.wordmark'), 1550],
      [root.querySelector('.profile-image'), 1660],
      [root.querySelector('.profile-intro'), 1770],
      [root.querySelector('.profile-nav'), 1880],
    ];
    for (const [child, delay] of reveals) {
      if (!child) continue;
      animations.push(child.animate([
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 1000, delay, easing: 'cubic-bezier(.22, .61, .36, 1)', fill: 'both' }));
    }
    const surroundings = [
      ...root.querySelectorAll('.map-labels, .live-readout, .portfolio-utilities'),
      ...document.querySelectorAll('.map-credit, north-compass'),
    ];
    for (const element of surroundings) animations.push(element.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 850, delay: 2050, easing: 'ease-in-out', fill: 'both',
    }));
    render(0);
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / INTRO_DURATION, 1);
      root.style.setProperty('--intro-shade', String(smooth((progress - .5) / .3)));
      render(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
  }

  if (demo) demo.hidden = !params.has('intro-demo');
  root.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (button?.hasAttribute('data-intro-replay')) play();
  }, { signal: events.signal });
  // Focusing the content or drawing on the map immediately completes the intro.
  document.addEventListener('focusin', event => {
    if ((event.target as Element).closest('.profile, .portfolio-utilities, .map-credit, north-compass')) finish();
  }, { signal: events.signal });
  motion.addEventListener('change', finish, { signal: events.signal });
  document.addEventListener('visibilitychange', finish, { signal: events.signal });
  play();
  return { finish, dispose() { finish(); events.abort(); } };
}
