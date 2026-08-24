// Canvas background system: atomic pattern, floating shapes, sparkle particles.
// Single rAF loop with delta-time normalization; devicePixelRatio-aware.
// ============ CANVAS BACKGROUND SYSTEM ============
const bgCanvas = document.getElementById('bg-canvas');

// Wire resize handling and start the single animation loop.
export function initBackground() {
  resizeBgCanvas();
}
const bgCtx = bgCanvas.getContext('2d');
let W, H;

function resizeBgCanvas() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  bgCanvas.width = W * dpr;
  bgCanvas.height = H * dpr;
  bgCanvas.style.width = W + 'px';
  bgCanvas.style.height = H + 'px';
  bgCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to avoid compounding scale
  bgCtx.scale(dpr, dpr);
}

window.addEventListener('resize', resizeBgCanvas);

const bgShapes = [
  { x: 0.08, y: 0.12, type: 'star5', color: 'rgba(255, 61, 127, 0.4)', size: 40, phase: 0 },
  { x: 0.15, y: 0.70, type: 'ring_dot', color1: 'rgba(46, 196, 182, 0.4)', color2: 'rgba(255, 217, 61, 0.5)', size: 50, phase: -3 },
  { x: 0.90, y: 0.25, type: 'star4', color: 'rgba(255, 217, 61, 0.5)', size: 35, phase: -6 },
  { x: 0.92, y: 0.85, type: 'circle', color: 'rgba(255, 61, 127, 0.4)', size: 45, phase: -9 },
  { x: 0.05, y: 0.45, type: 'star4', color: 'rgba(46, 196, 182, 0.4)', size: 30, phase: -12 }
];

const sparkles = [];

function drawStar(ctx, cx, cy, spikes, outer, inner) {
  let rot = Math.PI / 2 * 3;
  let x = cx, y = cy;
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

export function spawnSparkles(x, y) {
  const colors = ['#FFD93D', '#FF3D7F', '#2EC4B6', '#FFE54C'];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const distance = 60 + Math.random() * 40;
    sparkles.push({
      x, y,
      vx: Math.cos(angle) * distance * 0.03,
      vy: Math.sin(angle) * distance * 0.03 - 1.5,
      life: 1,
      color: colors[i % colors.length],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      size: 6 + Math.random() * 3
    });
  }
}

let bgTime = 0;
let lastTime = performance.now();

function animateBg(now) {
  const dt = Math.min((now - lastTime) / 16.666, 3); // Delta time, capped to avoid jumps
  lastTime = now;
  bgTime += dt / 60; // Convert to seconds roughly

  bgCtx.clearRect(0, 0, W, H);

  // 1. Atomic background pattern
  bgCtx.save();
  bgCtx.strokeStyle = 'rgba(255, 61, 127, 0.18)';
  bgCtx.lineWidth = 1.5;
  bgCtx.fillStyle = 'rgba(255, 61, 127, 0.18)';

  const pSize = 140;
  const pOffset = (bgTime * 2.33) % pSize; // Match original 60s linear drift speed

  for (let x = -pSize; x < W + pSize; x += pSize) {
    for (let y = -pSize; y < H + pSize; y += pSize) {
      const cx = x + pOffset;
      const cy = y + pOffset;
      bgCtx.beginPath();
      bgCtx.moveTo(cx + 50, cy + 15);
      bgCtx.lineTo(cx + 55, cy + 40);
      bgCtx.lineTo(cx + 80, cy + 45);
      bgCtx.lineTo(cx + 60, cy + 55);
      bgCtx.lineTo(cx + 65, cy + 80);
      bgCtx.lineTo(cx + 50, cy + 65);
      bgCtx.lineTo(cx + 35, cy + 80);
      bgCtx.lineTo(cx + 40, cy + 55);
      bgCtx.lineTo(cx + 20, cy + 45);
      bgCtx.lineTo(cx + 45, cy + 40);
      bgCtx.closePath();
      bgCtx.stroke();
      bgCtx.beginPath();
      bgCtx.arc(cx + 50, cy + 50, 3, 0, Math.PI * 2);
      bgCtx.fill();
    }
  }
  bgCtx.restore();

  // 2. Floating shapes
  bgShapes.forEach(s => {
    const baseX = s.x * W;
    const baseY = s.y * H;
    const y = baseY - Math.sin(bgTime * 0.314 + s.phase) * 15; // 0.314 = 20s cycle
    const rot = Math.sin(bgTime * 0.314 + s.phase) * (15 * Math.PI / 180);

    bgCtx.save();
    bgCtx.translate(baseX, y);
    bgCtx.rotate(rot);

    if (s.type === 'star5') {
      bgCtx.fillStyle = s.color;
      drawStar(bgCtx, 0, 0, 5, s.size/2, s.size/4);
      bgCtx.fill();
    } else if (s.type === 'star4') {
      bgCtx.fillStyle = s.color;
      drawStar(bgCtx, 0, 0, 4, s.size/2, s.size/4);
      bgCtx.fill();
    } else if (s.type === 'ring_dot') {
      bgCtx.strokeStyle = s.color1;
      bgCtx.lineWidth = 3;
      bgCtx.beginPath();
      bgCtx.arc(0, 0, s.size/2, 0, Math.PI * 2);
      bgCtx.stroke();
      bgCtx.fillStyle = s.color2;
      bgCtx.beginPath();
      bgCtx.arc(0, 0, s.size/4, 0, Math.PI * 2);
      bgCtx.fill();
    } else if (s.type === 'circle') {
      bgCtx.strokeStyle = s.color;
      bgCtx.lineWidth = 2.5;
      bgCtx.beginPath();
      bgCtx.arc(0, 0, s.size/2, 0, Math.PI * 2);
      bgCtx.stroke();
    }
    bgCtx.restore();
  });

  // 3. Sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const p = sparkles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // Gravity
    p.rotation += p.rotSpeed;
    p.life -= 0.02;

    if (p.life <= 0) {
      sparkles.splice(i, 1);
      continue;
    }

    bgCtx.save();
    bgCtx.translate(p.x, p.y);
    bgCtx.rotate(p.rotation);
    bgCtx.globalAlpha = Math.max(0, p.life);
    bgCtx.fillStyle = p.color;
    drawStar(bgCtx, 0, 0, 4, p.size, p.size / 2);
    bgCtx.fill();
    bgCtx.restore();
  }

  requestAnimationFrame(animateBg);
}

  requestAnimationFrame(animateBg);
}