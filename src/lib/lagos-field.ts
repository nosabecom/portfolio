import { isWater, LAGOS_ASPECT_RATIO, LAGOS_BOUNDS } from './lagos-geography';

type Particle = {
  x: number; y: number; size: number; alpha: number; shape: number; palette: number;
  ox: number; oy: number; vx: number; vy: number; angle: number; spin: number; energy: number;
};
type Sample = { x: number; y: number; time: number; down: boolean };
type Pulse = { x: number; y: number; start: number; strength: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; size: number; shape: number; angle: number };
type Batch = { strokes: Path2D; dots: Path2D };
const TAU = Math.PI * 2, TILE = 112, SHADES = 12;
// Two RGBA canvases stay below roughly 64 MB, including on large HiDPI screens.
const MAX_CANVAS_PIXELS = 8_000_000;
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const hash = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
function noise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v * (1 - u) + (d - b) * u * v;
}
/** An artistic relief field; the shoreline alone represents measured geography. */
function relief(x: number, y: number): number {
  const warp = noise(x * 3 + 8, y * 3 + 2);
  return noise(x * 3.5 + warp, y * 3.5 + warp) * .7 + noise(x * 8, y * 8) * .23 + noise(x * 17, y * 17) * .07;
}

export function mountLagosField(root: HTMLElement): () => void {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!context) return () => {};
  const ctx = context;
  const themeButton = document.querySelector<HTMLButtonElement>('.theme-button')!;
  const coordinateLabel = root.querySelector<HTMLElement>('.live-coordinates')!;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController(), { signal } = events;
  const active = new Set<number>();
  let points: (Particle | undefined)[] = [], samples: Sample[] = [], trace: Sample[] = [], pulses: Pulse[] = [], sparks: Spark[] = [];
  let previousTiles = new Set<number>(), nextTiles = new Set<number>();
  let restingMap: HTMLCanvasElement;
  let width = 0, height = 0, dpr = 1, spacing = 10, columns = 0, rows = 0, tileColumns = 0;
  let animation = 0, lastFrame = 0, time = 0, disposed = false, lastCoordinateUpdate = 0;
  let paused = reducedMotion.matches, dark = root.dataset.theme === 'dark';
  let down = false, pointerId: number | null = null, dragDistance = 0;
  let previousSample: Sample | null = null;
  let map = { left: 0, top: 0, width: 1, height: 1 };
  let palette: string[] = [], paper = '';

  function setPalette() {
    paper = dark ? '#0b1110' : '#f2f0e6';
    palette = dark
      ? ['#a7c6af', '#deedc9', '#648f88', '#b9f581', '#f2e5b7']
      : ['#38594c', '#247e6c', '#789791', '#638d21', '#a86527'];
    root.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.theme = root.dataset.theme;
    const themeLabel = `Switch to ${dark ? 'light' : 'dark'} mode`;
    themeButton.setAttribute('aria-label', themeLabel); themeButton.title = themeLabel;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paper);
  }

  function glyph(batches: Map<number, Batch>, shape: number, x: number, y: number, size: number, angle: number, color: number, alpha: number) {
    const shade = Math.round(clamp(alpha) * SHADES);
    if (!shade) return;
    const key = color * (SHADES + 1) + shade;
    let batch = batches.get(key);
    if (!batch) { batch = { strokes: new Path2D(), dots: new Path2D() }; batches.set(key, batch); }
    if (shape === 3) { batch.dots.rect(x - size * .25, y - size * .25, size * .5, size * .5); return; }
    const cos = angle ? Math.cos(angle) * size : size, sin = angle ? Math.sin(angle) * size : 0;
    const path = batch.strokes;
    // Construct the glyph directly: no closures or trigonometry for resting shapes.
    if (shape === 0) {
      path.moveTo(x - cos, y - sin); path.lineTo(x + cos, y + sin);
      path.moveTo(x + sin, y - cos); path.lineTo(x - sin, y + cos);
    } else if (shape === 1) {
      const a = .72 * (cos - sin), b = .72 * (cos + sin);
      path.moveTo(x - a, y - b); path.lineTo(x + a, y + b);
      path.moveTo(x + b, y - a); path.lineTo(x - b, y + a);
    } else if (shape === 2) {
      path.moveTo(x + sin * 1.1, y - cos * 1.1);
      path.lineTo(x + cos - sin * .7, y + sin + cos * .7);
      path.lineTo(x - cos - sin * .7, y - sin + cos * .7); path.closePath();
    }
  }

  function paintBatches(pen: CanvasRenderingContext2D, batches: Map<number, Batch>, animated = false) {
    pen.lineWidth = animated ? 1.05 : .85; pen.lineJoin = 'round';
    for (const [key, batch] of batches) {
      const color = Math.floor(key / (SHADES + 1)), alpha = (key % (SHADES + 1)) / SHADES;
      pen.strokeStyle = palette[color]; pen.fillStyle = palette[color]; pen.globalAlpha = alpha;
      pen.stroke(batch.strokes); pen.fill(batch.dots);
    }
    pen.globalAlpha = 1;
  }

  function cacheMap() {
    restingMap = document.createElement('canvas');
    restingMap.width = canvas.width; restingMap.height = canvas.height;
    const pen = restingMap.getContext('2d', { alpha: false })!;
    pen.scale(dpr, dpr); pen.fillStyle = paper; pen.fillRect(0, 0, width, height);
    const batches = new Map<number, Batch>();
    for (const p of points) if (p) glyph(batches, p.shape, p.x, p.y, p.size, 0, p.palette, p.alpha);
    paintBatches(pen, batches);
    ctx.globalAlpha = 1; ctx.drawImage(restingMap, 0, 0, width, height); previousTiles.clear();
  }

  function resetField() {
    for (const index of active) {
      const p = points[index]!; p.ox = p.oy = p.vx = p.vy = p.angle = p.spin = p.energy = 0;
    }
    active.clear(); samples = []; trace = []; pulses = []; sparks = []; previousSample = null;
    if (restingMap) { ctx.globalAlpha = 1; ctx.drawImage(restingMap, 0, 0, width, height); }
    previousTiles.clear(); nextTiles.clear();
  }

  function resize() {
    const bounds = root.getBoundingClientRect();
    const nextDpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(MAX_CANVAS_PIXELS / (bounds.width * bounds.height)));
    if (!bounds.width || !bounds.height || (width === bounds.width && height === bounds.height && dpr === nextDpr)) return;
    resetField(); width = bounds.width; height = bounds.height; dpr = nextDpr;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mobile = width <= 600;
    const mapWidth = mobile ? Math.max(width * 1.85, height * LAGOS_ASPECT_RATIO * .82) : Math.max(width * .96, Math.min(height * LAGOS_ASPECT_RATIO, width * 1.1));
    map = { width: mapWidth, height: mapWidth / LAGOS_ASPECT_RATIO, left: (width - mapWidth) / 2, top: 0 };
    map.top = (height - map.height) * (mobile ? .4 : .43);
    for (const [key, value] of Object.entries(map)) root.style.setProperty(`--map-${key}`, `${value}px`);
    const labels = Array.from(root.querySelectorAll<HTMLElement>('.place-label'));
    const clippedLabels = labels.map((label) => {
      const rect = label.getBoundingClientRect();
      return rect.left < bounds.left + 12 || rect.right > bounds.right - 12 || rect.top < bounds.top + 12 || rect.bottom > bounds.bottom - 12;
    });
    labels.forEach((label, index) => { label.style.visibility = mobile && clippedLabels[index] ? 'hidden' : ''; });
    spacing = Math.max(mobile ? 7.5 : 9.5, Math.sqrt(width * height / 15500));
    columns = Math.ceil(width / spacing); rows = Math.ceil(height / spacing); tileColumns = Math.ceil(width / TILE);
    points = new Array(columns * rows);
    const water = new Uint8Array(points.length), coastDistance = new Float32Array(points.length).fill(100);
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const index = row * columns + col, x = col * spacing + spacing / 2, y = row * spacing + spacing / 2;
      const u = (x - map.left) / map.width, v = (y - map.top) / map.height;
      water[index] = isWater(u, v) ? 1 : 0;
      if (water[index]) coastDistance[index] = 0;
    }
    // Highlight the actual shoreline using distance to water, without adding contour lines.
    for (let i = 0; i < coastDistance.length; i++) {
      if (i % columns) coastDistance[i] = Math.min(coastDistance[i], coastDistance[i - 1] + 1);
      if (i >= columns) coastDistance[i] = Math.min(coastDistance[i], coastDistance[i - columns] + 1);
    }
    for (let i = coastDistance.length - 1; i >= 0; i--) {
      if (i % columns < columns - 1) coastDistance[i] = Math.min(coastDistance[i], coastDistance[i + 1] + 1);
      if (i < coastDistance.length - columns) coastDistance[i] = Math.min(coastDistance[i], coastDistance[i + columns] + 1);
    }
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const index = row * columns + col, x = col * spacing + spacing / 2, y = row * spacing + spacing / 2;
      const u = (x - map.left) / map.width, v = (y - map.top) / map.height;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      const h = relief(u, v), band = Math.pow((Math.cos(h * 94) + 1) / 2, 2.8), shore = Math.exp(-coastDistance[index] * .55);
      const random = hash(col, row), wet = !!water[index];
      const edge = Math.min(clamp(u * 16), clamp((1 - u) * 16), clamp(v * 16), clamp((1 - v) * 16));
      const frame = clamp((y - 60) / 70) * clamp((height - y - 65) / 85);
      points[index] = {
        x, y, size: (wet ? 1.4 : 1.65 + band * 1.05 + shore * .8) * (mobile ? .84 : 1),
        alpha: (wet ? .2 + random * .1 : .36 + band * .46 + shore * .25) * edge * frame,
        shape: wet ? 3 : (Math.floor(h * 18) + (random > .93 ? 1 : 0)) % 3,
        palette: wet ? 2 : shore > .24 ? 1 : 0,
        ox: 0, oy: 0, vx: 0, vy: 0, angle: 0, spin: 0, energy: 0,
      };
    }
    cacheMap();
  }

  function nearby(left: number, top: number, right: number, bottom: number, visit: (p: Particle, index: number) => void) {
    const x1 = clamp(Math.floor(left / spacing), 0, columns - 1), x2 = clamp(Math.ceil(right / spacing), 0, columns - 1);
    const y1 = clamp(Math.floor(top / spacing), 0, rows - 1), y2 = clamp(Math.ceil(bottom / spacing), 0, rows - 1);
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
      const index = y * columns + x, p = points[index]; if (p) visit(p, index);
    }
  }

  function deposit(from: Sample, to: Sample) {
    const dx = to.x - from.x, dy = to.y - from.y, distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);
    const radius = to.down ? 77 : 43, force = to.down ? 1.4 : .75;
    const radiusSquared = radius * radius, dragX = clamp(dx, -35, 35) * 2.4, dragY = clamp(dy, -35, 35) * 2.4;
    nearby(Math.min(from.x, to.x) - radius, Math.min(from.y, to.y) - radius,
      Math.max(from.x, to.x) + radius, Math.max(from.y, to.y) + radius, (p, index) => {
        const along = distanceSquared ? clamp(((p.x - from.x) * dx + (p.y - from.y) * dy) / distanceSquared) : 0;
        const rx = p.x - from.x - dx * along, ry = p.y - from.y - dy * along, distanceFromTrail = rx * rx + ry * ry;
        if (distanceFromTrail >= radiusSquared) return;
        const r = Math.sqrt(distanceFromTrail);
        const push = (1 - r / radius) ** 2 * force;
        p.energy = Math.max(p.energy, push);
        p.vx = clamp(p.vx + (rx / Math.max(r, 1) * 48 + dragX - ry * .7) * push, -210, 210);
        p.vy = clamp(p.vy + (ry / Math.max(r, 1) * 48 + dragY + rx * .7) * push, -210, 210);
        p.spin = clamp(p.spin + push * (to.down ? 8 : 4), -14, 14); active.add(index);
      });
    const count = Math.min(16, Math.floor(distance / 9));
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / Math.max(1, count), jitter = hash(time + i, to.x), spread = to.down ? 17 : 7;
      sparks.push({ x: from.x + dx * t + (jitter - .5) * spread, y: from.y + dy * t + (hash(to.y, i) - .5) * spread,
        vx: dx * .35 + (jitter - .5) * 16, vy: dy * .35 - 9, life: 1, size: to.down ? 2 + jitter * 1.5 : 1.3 + jitter,
        shape: i % 3, angle: jitter * TAU });
    }
    if (sparks.length > 100) sparks.splice(0, sparks.length - 100);
  }

  function addTiles(tiles: Set<number>, x: number, y: number, radius: number) {
    const x1 = Math.max(0, Math.floor((x - radius) / TILE)), x2 = Math.min(tileColumns - 1, Math.floor((x + radius) / TILE));
    const y1 = Math.max(0, Math.floor((y - radius) / TILE)), y2 = Math.min(Math.ceil(height / TILE) - 1, Math.floor((y + radius) / TILE));
    for (let row = y1; row <= y2; row++) for (let col = x1; col <= x2; col++) tiles.add(row * tileColumns + col);
  }

  function render() {
    if (!restingMap) return;
    ctx.globalAlpha = 1;
    for (const tile of previousTiles) {
      const x = (tile % tileColumns) * TILE, y = Math.floor(tile / tileColumns) * TILE;
      const w = Math.min(TILE, width - x), h = Math.min(TILE, height - y);
      ctx.drawImage(restingMap, x * dpr, y * dpr, w * dpr, h * dpr, x, y, w, h);
    }
    const tiles = nextTiles, batches = new Map<number, Batch>(), erase = new Path2D();
    tiles.clear();
    for (const index of active) {
      const p = points[index]!, padding = p.size * 1.15 + .8;
      erase.rect(p.x - padding, p.y - padding, padding * 2, padding * 2);
      addTiles(tiles, p.x, p.y, padding); addTiles(tiles, p.x + p.ox, p.y + p.oy, p.size * 2 + 2);
      const color = p.energy > .75 ? 4 : 3;
      glyph(batches, p.shape, p.x + p.ox, p.y + p.oy, p.size * (1 + p.energy * .35), p.angle, color, clamp(p.alpha + p.energy * .7));
    }
    ctx.fillStyle = paper; ctx.fill(erase);
    ctx.lineCap = 'round'; ctx.strokeStyle = palette[3];
    for (let i = 1; i < trace.length; i++) {
      const a = trace[i - 1], b = trace[i], life = clamp(1 - (time - b.time) / 1100);
      const dx = b.x - a.x, dy = b.y - a.y, distanceSquared = dx * dx + dy * dy;
      if (b.time - a.time > 140 || distanceSquared > 130 * 130) continue;
      ctx.globalAlpha = life * (b.down ? .4 : .2); ctx.lineWidth = life * (b.down ? 2 : 1);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      const steps = Math.ceil(Math.sqrt(distanceSquared) / 70);
      for (let j = 0; j <= steps; j++) addTiles(tiles, a.x + (b.x - a.x) * j / Math.max(steps, 1), a.y + (b.y - a.y) * j / Math.max(steps, 1), 5);
    }
    for (const spark of sparks) {
      glyph(batches, spark.shape, spark.x, spark.y, spark.size * spark.life, spark.angle, 3, spark.life * .8);
      addTiles(tiles, spark.x, spark.y, 6);
    }
    paintBatches(ctx, batches, true);
    nextTiles = previousTiles; previousTiles = tiles;
  }

  function frame(timestamp: number) {
    animation = 0;
    if (disposed || document.hidden || paused || reducedMotion.matches) return;
    const elapsed = lastFrame ? Math.min(timestamp - lastFrame, 50) : 16.7;
    lastFrame = timestamp; time += elapsed;
    const dt = Math.min(elapsed / 1000, .032);
    const energyDecay = Math.exp(-dt * 2.1), sparkDrag = Math.exp(-dt * 3);
    for (const sample of samples) {
      sample.time = time;
      deposit(previousSample && time - previousSample.time < 180 ? previousSample : sample, sample);
      trace.push(sample); previousSample = sample;
    }
    samples = [];
    if (trace.length > 80) trace.splice(0, trace.length - 80);
    trace = trace.filter(s => time - s.time < 1100);
    pulses = pulses.filter(pulse => time - pulse.start < 1400);
    for (const pulse of pulses) {
      const age = (time - pulse.start) / 1000, radius = age * 245, fade = 1 - age / 1.4;
      const innerRadiusSquared = Math.max(0, radius - 24) ** 2, outerRadiusSquared = (radius + 24) ** 2;
      nearby(pulse.x - radius - 24, pulse.y - radius - 24, pulse.x + radius + 24, pulse.y + radius + 24, (p, index) => {
        const dx = p.x - pulse.x, dy = p.y - pulse.y, distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < innerRadiusSquared || distanceSquared > outerRadiusSquared) return;
        const r = Math.sqrt(distanceSquared), edge = Math.abs(r - radius);
        const impact = (1 - edge / 24) * fade * pulse.strength;
        p.energy = Math.max(p.energy, impact); p.vx += dx / Math.max(r, 1) * impact * dt * 720;
        p.vy += dy / Math.max(r, 1) * impact * dt * 720; p.spin += impact * dt * 22; active.add(index);
      });
    }
    for (const index of active) {
      const p = points[index]!;
      p.vx += (-p.ox * 115 - p.vx * 12) * dt; p.vy += (-p.oy * 115 - p.vy * 12) * dt;
      p.ox = clamp(p.ox + p.vx * dt, -45, 45); p.oy = clamp(p.oy + p.vy * dt, -45, 45);
      p.spin += (-p.angle * 42 - p.spin * 9) * dt; p.angle += p.spin * dt;
      p.energy *= energyDecay;
      // Restore the cached map when the green highlight ends, avoiding a pale afterglow.
      if (p.energy < .08) {
        p.ox = p.oy = p.vx = p.vy = p.angle = p.spin = p.energy = 0; active.delete(index);
      }
    }
    sparks = sparks.filter(spark => {
      spark.life -= dt * .9; spark.x += spark.vx * dt; spark.y += spark.vy * dt;
      spark.vx *= sparkDrag; spark.vy *= sparkDrag; spark.angle += dt * .8;
      return spark.life > 0;
    });
    render();
    if (active.size || samples.length || trace.length || pulses.length || sparks.length) animation = requestAnimationFrame(frame);
  }

  function wake() {
    if (!animation && !paused && !reducedMotion.matches && !document.hidden && !disposed) {
      lastFrame = 0; animation = requestAnimationFrame(frame);
    }
  }
  function addPulse(x: number, y: number, strength = 1) {
    if (paused || reducedMotion.matches) return;
    pulses.push({ x, y, start: time, strength }); if (pulses.length > 3) pulses.shift(); wake();
  }
  function endDrag() {
    if (pointerId !== null && root.hasPointerCapture(pointerId)) root.releasePointerCapture(pointerId);
    pointerId = null; down = false; root.dataset.drawing = 'false';
  }
  function updateMotion() {
    root.dataset.paused = String(paused);
    if (paused) { cancelAnimationFrame(animation); animation = 0; endDrag(); resetField(); }
  }

  const isControl = (target: EventTarget | null) => target instanceof Element && !!target.closest('a, button, input, textarea, select, [data-no-terrain]');
  function samplePointer(event: PointerEvent) {
    const bounds = root.getBoundingClientRect(), x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    const now = performance.now();
    if (now - lastCoordinateUpdate > 90) {
      const u = (x - map.left) / map.width, v = (y - map.top) / map.height;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) coordinateLabel.textContent = `${(LAGOS_BOUNDS.north - v * (LAGOS_BOUNDS.north - LAGOS_BOUNDS.south)).toFixed(4)}° N / ${(LAGOS_BOUNDS.west + u * (LAGOS_BOUNDS.east - LAGOS_BOUNDS.west)).toFixed(4)}° E`;
      lastCoordinateUpdate = now;
    }
    if (paused || reducedMotion.matches) return;
    const last = samples[samples.length - 1] ?? previousSample;
    if (down && last) dragDistance += Math.hypot(x - last.x, y - last.y);
    samples.push({ x, y, down, time }); if (samples.length > 16) samples.shift(); wake();
  }
  root.addEventListener('pointermove', event => {
    if (pointerId !== null && event.pointerId !== pointerId) return;
    if (isControl(event.target) || (event.pointerType === 'touch' && !down)) { previousSample = null; return; }
    samplePointer(event);
  }, { signal, passive: true });
  root.addEventListener('pointerdown', event => {
    if (pointerId !== null || event.button !== 0 || isControl(event.target)) return;
    // A map gesture should not start native text selection after repeated clicks.
    event.preventDefault();
    if (paused || reducedMotion.matches) return;
    down = true; pointerId = event.pointerId; dragDistance = 0; previousSample = null;
    root.dataset.drawing = 'true'; root.setPointerCapture(event.pointerId); samplePointer(event);
  }, { signal });
  root.addEventListener('pointerup', event => {
    if (event.pointerId !== pointerId) return;
    const bounds = root.getBoundingClientRect();
    addPulse(event.clientX - bounds.left, event.clientY - bounds.top, dragDistance > 8 ? .55 : 1.1);
    endDrag(); previousSample = null;
  }, { signal });
  root.addEventListener('pointercancel', event => {
    if (event.pointerId === pointerId) { endDrag(); previousSample = null; }
  }, { signal });
  root.addEventListener('lostpointercapture', event => {
    if (event.pointerId === pointerId) { down = false; pointerId = null; previousSample = null; root.dataset.drawing = 'false'; }
  }, { signal });
  root.addEventListener('pointerleave', () => { if (!down) previousSample = null; }, { signal });
  window.addEventListener('blur', () => { endDrag(); previousSample = null; }, { signal });
  themeButton.addEventListener('click', () => { endDrag(); resetField(); dark = !dark; setPalette(); cacheMap(); }, { signal });
  reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; updateMotion(); }, { signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(animation); animation = 0; endDrag(); resetField(); }
  }, { signal });
  const observer = new ResizeObserver(resize);
  setPalette(); updateMotion(); resize(); observer.observe(root);
  return () => { disposed = true; events.abort(); observer.disconnect(); cancelAnimationFrame(animation); endDrag(); };
}
