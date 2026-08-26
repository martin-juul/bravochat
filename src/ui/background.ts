/**
 * Background system: the atomic pattern and floating shapes are rasterized
 * ONCE to offscreen canvases and handed to CSS as background images, so idle
 * CPU is ~0. The canvas rAF loop runs ONLY while sparkle particles are alive.
 */

interface FloatingShape {
  x: number; // normalized horizontal position (0–1)
  y: number; // normalized vertical position (0–1)
  type: 'star5' | 'star4' | 'ring_dot' | 'circle';
  color?: string;
  color1?: string;
  color2?: string;
  size: number; // diameter in px
  phase: number; // bob-cycle offset in seconds
}

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 → 0, particle dies at 0
  color: string;
  rotation: number;
  rotSpeed: number;
  size: number;
}

const PATTERN_SIZE = 140;

/** Draw an N-pointed star path (no fill/stroke). */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outer: number,
  inner: number,
): void {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outer);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outer;
    y = cy + Math.sin(rot) * outer;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * inner;
    y = cy + Math.sin(rot) * inner;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outer);
  ctx.closePath();
}

/** Render one floating-shape sprite to a data URL (drawn once, animated by CSS). */
function shapeSprite(s: FloatingShape): string {
  const pad = 4; // keep strokes inside the sprite bounds
  const c = document.createElement('canvas');
  c.width = s.size + pad * 2;
  c.height = s.size + pad * 2;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const cx = c.width / 2;
  const cy = c.height / 2;
  const r = s.size / 2;

  if (s.type === 'star5' || s.type === 'star4') {
    ctx.fillStyle = s.color ?? 'transparent';
    drawStar(ctx, cx, cy, s.type === 'star5' ? 5 : 4, r, r / 2);
    ctx.fill();
  } else if (s.type === 'ring_dot') {
    ctx.strokeStyle = s.color1 ?? 'transparent';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = s.color2 ?? 'transparent';
    ctx.beginPath();
    ctx.arc(cx, cy, r / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = s.color ?? 'transparent';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  return c.toDataURL();
}

/** The repeating atom-orbit tile, rendered once to a data URL. */
function patternSprite(): string {
  const c = document.createElement('canvas');
  c.width = PATTERN_SIZE;
  c.height = PATTERN_SIZE;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.strokeStyle = 'rgba(255, 61, 127, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = 'rgba(255, 61, 127, 0.18)';
  const cx = 50;
  const cy = 50;
  ctx.beginPath();
  ctx.moveTo(cx + 50, cy + 15);
  ctx.lineTo(cx + 55, cy + 40);
  ctx.lineTo(cx + 80, cy + 45);
  ctx.lineTo(cx + 60, cy + 55);
  ctx.lineTo(cx + 65, cy + 80);
  ctx.lineTo(cx + 50, cy + 65);
  ctx.lineTo(cx + 35, cy + 80);
  ctx.lineTo(cx + 40, cy + 55);
  ctx.lineTo(cx + 20, cy + 45);
  ctx.lineTo(cx + 45, cy + 40);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 50, cy + 50, 3, 0, Math.PI * 2);
  ctx.fill();
  return c.toDataURL();
}

const bgShapes: FloatingShape[] = [
  { x: 0.08, y: 0.12, type: 'star5', color: 'rgba(255, 61, 127, 0.4)', size: 40, phase: 0 },
  {
    x: 0.15,
    y: 0.7,
    type: 'ring_dot',
    color1: 'rgba(46, 196, 182, 0.4)',
    color2: 'rgba(255, 217, 61, 0.5)',
    size: 50,
    phase: -3,
  },
  { x: 0.9, y: 0.25, type: 'star4', color: 'rgba(255, 217, 61, 0.5)', size: 35, phase: -6 },
  { x: 0.92, y: 0.85, type: 'circle', color: 'rgba(255, 61, 127, 0.4)', size: 45, phase: -9 },
  { x: 0.05, y: 0.45, type: 'star4', color: 'rgba(46, 196, 182, 0.4)', size: 30, phase: -12 },
];

/** Install the CSS-animated background; no animation loop is started. */
export function initBackground(): void {
  const pattern = document.querySelector<HTMLElement>('.bg-pattern');
  if (pattern) pattern.style.backgroundImage = `url(${patternSprite()})`;

  const shapesHost = document.getElementById('bg-shapes');
  if (!shapesHost) return;
  for (const s of bgShapes) {
    const el = document.createElement('div');
    el.className = 'bg-shape';
    el.style.left = `${s.x * 100}%`;
    el.style.top = `${s.y * 100}%`;
    el.style.width = `${s.size + 8}px`;
    el.style.height = `${s.size + 8}px`;
    el.style.backgroundImage = `url(${shapeSprite(s)})`;
    el.style.animationDelay = `${s.phase}s`;
    shapesHost.appendChild(el);
  }
}

// Sparkles: the only canvas-rendered, JS-animated effect

const fxCanvas = document.getElementById('fx-canvas') as HTMLCanvasElement;
const fxCtx = fxCanvas.getContext('2d') as CanvasRenderingContext2D;
let W = 0;
let H = 0;

function resizeFxCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  fxCanvas.width = W * dpr;
  fxCanvas.height = H * dpr;
  fxCanvas.style.width = W + 'px';
  fxCanvas.style.height = H + 'px';
  fxCtx.setTransform(1, 0, 0, 1, 0, 0);
  fxCtx.scale(dpr, dpr);
}

window.addEventListener('resize', resizeFxCanvas);
resizeFxCanvas();

const sparkles: Sparkle[] = [];

let loopRunning = false; // whether the sparkle loop is currently scheduled
let lastTime = performance.now();

/** Emit an 8-particle sparkle burst centered on (x, y) — called on message send.
 * Starts the canvas loop on demand; it self-stops when the last particle dies. */
export function spawnSparkles(x: number, y: number): void {
  const colors = ['#FFD93D', '#FF3D7F', '#2EC4B6', '#FFE54C'];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const distance = 60 + Math.random() * 40;
    sparkles.push({
      x,
      y,
      vx: Math.cos(angle) * distance * 0.03,
      vy: Math.sin(angle) * distance * 0.03 - 1.5,
      life: 1,
      color: colors[i % colors.length] ?? '#FFD93D',
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      size: 6 + Math.random() * 3,
    });
  }
  if (!loopRunning) {
    loopRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(animateSparkles);
  }
}

function animateSparkles(now: DOMHighResTimeStamp): void {
  if (sparkles.length === 0) {
    fxCtx.clearRect(0, 0, W, H);
    loopRunning = false;
    return;
  }

  const dt = Math.min((now - lastTime) / 16.666, 3);
  lastTime = now;

  fxCtx.clearRect(0, 0, W, H);
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const p = sparkles[i];
    if (!p) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.1 * dt;
    p.rotation += p.rotSpeed * dt;
    p.life -= 0.02 * dt;

    if (p.life <= 0) {
      sparkles.splice(i, 1);
      continue;
    }

    fxCtx.save();
    fxCtx.translate(p.x, p.y);
    fxCtx.rotate(p.rotation);
    fxCtx.globalAlpha = Math.max(0, p.life);
    fxCtx.fillStyle = p.color;
    drawStar(fxCtx, 0, 0, 4, p.size, p.size / 2);
    fxCtx.fill();
    fxCtx.restore();
  }

  requestAnimationFrame(animateSparkles);
}
