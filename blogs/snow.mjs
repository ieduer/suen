// 初雪：雪片在視窗前飄落，落到真實 HTML 文字的筆畫、圓相與梅枝上，逐格積起。
// 文字仍是可選取、可朗讀的 DOM；積雪只讀取它們的實際字形位置，畫在最上層的畫布。
const CELL = 3;                    // 積雪格的邊長（CSS px）
const INK = '#27231f', BENGARA = '#97402a';

const seeded = seed => () => (seed = seed * 16807 % 2147483647) / 2147483647;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const noise1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function sizeCanvas(c) {
  const r = c.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.max(1, Math.round(r.width * d)); c.height = Math.max(1, Math.round(r.height * d));
  return { w: r.width, h: r.height, d };
}

// 圓相：一筆乾濕交替的墨圈。按壓起筆，墨漸乾，筆毛分岔成飛白，收在左下的缺口前。
export function paintEnso(c) {
  const { w, d } = sizeCanvas(c);
  const g = c.getContext('2d'), k = w / 500 * d;
  g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, 500, 500);
  const rnd = seeded(7), start = Math.PI * .74, sweep = Math.PI * 1.8, B = 54, N = 420;
  const radius = a => 194 * (1 + .016 * Math.sin(2.2 * a + 1.3) + .008 * Math.sin(5.3 * a));
  const width = t => 38 * (t < .05 ? .62 + 7.6 * t : 1 - .2 * smooth(.1, .5, t) - .62 * smooth(.55, 1, t)) * (.94 + .12 * noise1(t * 9));
  const at = (t, o) => { const a = start + sweep * t, r = radius(a) + o * width(t) / 2; return [250 + Math.cos(a) * r, 252 + Math.sin(a) * r]; };
  g.lineCap = 'round';
  for (let b = 0; b < B; b++) {
    const o = (b / (B - 1)) * 2 - 1 + (rnd() - .5) * .04, edge = Math.abs(o), bias = rnd() * .3;
    g.strokeStyle = `rgba(39,35,31,${(.62 + rnd() * .3).toFixed(3)})`;
    g.lineWidth = 2.1 + rnd() * 1.4;
    g.beginPath(); let down = false;
    for (let i = 0; i <= N; i++) {
      const t = i / N, ink = 1.08 - .95 * Math.pow(t, 1.5) - edge * .28 * t;
      const on = noise1(t * (15 + b % 5) + b * 13.7) * .9 + bias * t < ink;
      const [x, y] = at(t, o * (1 - .3 * smooth(.7, 1, t)));
      if (on && !down) { g.moveTo(x, y); down = true; } else if (on) g.lineTo(x, y); else down = false;
    }
    g.stroke();
  }
}

// 梅枝一段：主枝從邊緣橫入、微垂，枝上抽出筆直向上的徒長枝；枝頭幾點弁柄色的梅。
export function paintBranch(c, mirror) {
  const { w, h, d } = sizeCanvas(c);
  const g = c.getContext('2d');
  g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h);
  if (mirror) { g.translate(w, 0); g.scale(-1, 1); }
  const rnd = seeded(29), s = w / 640, segs = [], buds = [], blooms = [];
  function stroke(x, y, ang, len, wid, n, bend, droop, grow) {
    for (let k = 0; k < n; k++) {
      const l = len / n * (.75 + rnd() * .5);
      ang += (rnd() - .5) * bend - droop;
      const nx = x + Math.cos(ang) * l, ny = y + Math.sin(ang) * l, nw = Math.max(1.2 * s, wid * (1 - .55 / n));
      segs.push([x, y, nx, ny, wid, nw]);
      if (grow) grow(nx, ny, ang, nw, k, n);
      x = nx; y = ny; wid = nw;
    }
    return [x, y];
  }
  const shoot = (x, y, wid) => {
    const len = h * (.16 + rnd() * .2), [tx, ty] = stroke(x, y, -Math.PI / 2 + (rnd() - .5) * .55, len, wid, 2 + (rnd() * 2 | 0), .16, 0);
    (rnd() < .45 ? blooms : buds).push([tx, ty]);
    if (rnd() < .6) buds.push([x + (tx - x) * .55, y + (ty - y) * .55]);
  };
  stroke(w + 8 * s, h * .52, Math.PI - .04, w * .84, 17 * s, 8, .42, -.035, (x, y, ang, wid, k, n) => {
    if (k === 0 || k === n - 1) return;
    if (rnd() < .72) shoot(x, y - wid * .3, wid * .42);
    if (k === 3) stroke(x, y, ang + .62, w * .2, wid * .55, 3, .3, 0, (sx, sy, sa, sw, j) => { if (j === 1) shoot(sx, sy, sw * .6); });
  });
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [x, y, nx, ny, w0, w1] of segs) {
    g.strokeStyle = INK; g.globalAlpha = .9;
    g.lineWidth = (w0 + w1) / 2; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
    // 乾筆的擦痕
    if (w0 > 5 * s) {
      g.globalAlpha = .3; g.strokeStyle = '#ece6d8'; g.lineWidth = .8 * s;
      for (let q = 0; q < 3; q++) { const o = (rnd() - .5) * w0 * .6, a = Math.atan2(ny - y, nx - x) + Math.PI / 2, ox = Math.cos(a) * o, oy = Math.sin(a) * o, f = .2 + rnd() * .5; g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox + (nx - x) * f, y + oy + (ny - y) * f); g.stroke(); }
    }
  }
  g.globalAlpha = 1;
  buds.forEach(([x, y], i) => { g.fillStyle = BENGARA; g.beginPath(); g.ellipse(x, y, 2.4 * s, 3.4 * s, i * .7, 0, Math.PI * 2); g.fill(); });
  blooms.forEach(([x, y], i) => {
    const r = (4.6 + rnd() * 1.6) * s;
    g.fillStyle = 'rgba(151,64,42,.9)';
    for (let p = 0; p < 5; p++) { const a = p * 1.2566 + i; g.beginPath(); g.arc(x + Math.cos(a) * r * .9, y + Math.sin(a) * r * .9, r * .62, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = INK; g.beginPath(); g.arc(x, y, r * .28, 0, Math.PI * 2); g.fill();
  });
}

function flakeSprite(r, rim) {
  const c = document.createElement('canvas'), n = Math.ceil(r * 2 + 4);
  c.width = c.height = n * 2;
  const g = c.getContext('2d'); g.scale(2, 2);
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, r + 1);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(.62, 'rgba(252,252,250,.96)');
  grad.addColorStop(.86, `rgba(150,164,176,${rim})`); grad.addColorStop(1, 'rgba(150,164,176,0)');
  g.fillStyle = grad; g.beginPath(); g.arc(n / 2, n / 2, r + 1, 0, Math.PI * 2); g.fill();
  return c;
}

export function createSnow({ canvas, inks, reduced }) {
  const ctx = canvas.getContext('2d');
  const sprites = [flakeSprite(1.8, .62), flakeSprite(2.8, .66), flakeSprite(5.4, .42)];
  const LAYER = [{ alpha: .75, size: 1.5, v: 20 }, { alpha: 1, size: 2.5, v: 38 }, { alpha: .85, size: 5, v: 66 }];
  let vw = 0, vh = 0, dpr = 1, GW = 0, GH = 0;
  let S, ledge, cap, queued, pix, img, layer, shade, dirty = false, active = [];
  let storm = 0, stormTarget = 0, frozen = false, raf = 0, last = performance.now(), built = false;
  const flakes = [], puffs = [], pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };

  // ---------- 積雪格 ----------
  const solid = i => ledge[i] || S[i];
  const free = i => !S[i] && !ledge[i];
  function set(i, v) {
    S[i] = v;
    pix[i] = v ? ((205 + (hash(i) * 50 | 0)) << 24 | 0xf6fafb) >>> 0 : 0;
    dirty = true;
  }
  function wake(i) { if (S[i] && !queued[i]) { queued[i] = 1; active.push(i); } }
  function wakeAbove(i) {
    const u = i - GW; if (u < 0) return;
    const x = i % GW; wake(u); if (x > 0) wake(u - 1); if (x < GW - 1) wake(u + 1);
  }
  function step() {
    const list = active; active = [];
    for (const i of list) queued[i] = 0;
    for (const i of list) {
      if (!S[i]) continue;
      const x = i % GW, b = i + GW;
      if (b >= S.length) { set(i, 0); wakeAbove(i); continue; }
      let to = -1;
      if (free(b)) to = b;
      else {
        const dd = Math.random() < .5 ? -1 : 1;
        if (x + dd >= 0 && x + dd < GW && free(b + dd) && free(i + dd) && Math.random() < .7) to = b + dd;
        else if (x - dd >= 0 && x - dd < GW && free(b - dd) && free(i - dd) && Math.random() < .7) to = b - dd;
      }
      if (to < 0) continue;
      set(i, 0); set(to, 1); wake(to); wakeAbove(i);
    }
  }
  // 雪片到了一處：下面要有東西承著，且這一柱的雪未超過該處能承的厚度
  function land(px, py) {
    const gx = Math.floor(px / CELL), gy = Math.floor(py / CELL);
    if (gx < 0 || gx >= GW || gy < 1 || gy >= GH - 1) return 0;
    const i = gy * GW + gx;
    if (!free(i) || !solid(i + GW)) return 0;
    let depth = 0, j = i + GW;
    while (S[j] && depth < 12) { depth++; j += GW; }
    if (!ledge[j] || depth >= cap[j]) return -1;
    set(i, 1); wake(i);
    return 1;
  }
  function brush(px, py, radius) {
    const r = radius / CELL, cx = px / CELL, cy = py / CELL;
    let n = 0;
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(GH - 1, Math.ceil(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(GW - 1, Math.ceil(cx + r)); x++) {
        const i = y * GW + x;
        if (!S[i] || (x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
        set(i, 0); wakeAbove(i);
        if (n++ % 3 === 0 && !reduced) puff(x * CELL, y * CELL);
      }
    if (n) request();
  }
  function drop(x, y) {
    if (puffs.length < 1500) puffs.push({ x, y, vx: (Math.random() - .5) * 20, vy: Math.random() * 30, life: .9 });
  }
  function puff(x, y) {
    puffs.push({ x, y, vx: (Math.random() - .5) * 90 + pointer.vx * .15, vy: -30 - Math.random() * 90, life: 1 });
    if (puffs.length > 600) puffs.splice(0, puffs.length - 600);
  }

  // ---------- 讀取真實版面的形狀 ----------
  function capStyle(n) { return `rgb(${n * 30},0,0)`; }
  function glyphs(g, el) {
    const cs = getComputedStyle(el), size = parseFloat(cs.fontSize);
    const vertical = cs.writingMode.startsWith('vertical');
    g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = capStyle(Math.max(1, Math.min(6, Math.round(size / 30))));
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), range = document.createRange();
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
      const text = node.data;
      for (let k = 0; k < text.length; k++) {
        const ch = text[k];
        if (/\s/.test(ch)) continue;
        range.setStart(node, k); range.setEnd(node, k + 1);
        const b = range.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        const x = b.left + scrollX, y = b.top + scrollY;
        if (vertical) g.fillText(ch, x + b.width / 2, y + size / 2);
        else g.fillText(ch, x + g.measureText(ch).width / 2, y + b.height / 2);
      }
    }
  }
  function buildLedges() {
    const m = document.createElement('canvas'); m.width = GW; m.height = GH;
    const g = m.getContext('2d', { willReadFrequently: true });
    g.scale(1 / CELL, 1 / CELL);
    for (const c of inks) {
      const r = c.getBoundingClientRect();
      if (r.width && c.width > 1) g.drawImage(c, r.left + scrollX, r.top + scrollY, r.width, r.height);
    }
    g.globalCompositeOperation = 'source-in'; g.fillStyle = capStyle(4); g.fillRect(0, 0, GW * CELL, GH * CELL);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = capStyle(2);
    for (const el of document.querySelectorAll('[data-snow-edge]')) {
      const r = el.getBoundingClientRect();
      if (r.width) g.fillRect(r.left + scrollX, r.top + scrollY, r.width, CELL);
    }
    for (const el of document.querySelectorAll('[data-snow]')) glyphs(g, el);
    const d = g.getImageData(0, 0, GW, GH).data;
    for (let i = 0; i < GW * GH; i++) {
      const on = d[i * 4 + 3] > 110;
      ledge[i] = on ? 1 : 0;
      cap[i] = on ? Math.max(1, Math.round(d[i * 4] / 30)) : 0;
    }
    // 版面變了：埋進字裡的雪抖落，失去承托的雪整片滑落
    const held = new Uint8Array(GW * GH);
    for (let y = GH - 2; y >= 0; y--) for (let x = 0; x < GW; x++) {
      const i = y * GW + x;
      if (!S[i]) continue;
      if (ledge[i]) { set(i, 0); if (!reduced) puff(x * CELL, y * CELL); continue; }
      const b = i + GW;
      if (ledge[b] || held[b] || (x > 0 && held[b - 1]) || (x < GW - 1 && held[b + 1])) { held[i] = 1; wake(i); continue; }
      set(i, 0); if (!reduced && (x + y) % 2) drop(x * CELL, y * CELL);
    }
  }
  function dust(amount) {
    for (let i = GW; i < S.length; i++) {
      if (!ledge[i] || ledge[i - GW] || S[i - GW]) continue;
      const n = Math.round(cap[i] * amount * (.35 + Math.random() * .65));
      for (let k = 1, j = i - GW; k <= n && j >= 0 && !ledge[j]; k++, j -= GW) set(j, 1);
    }
    for (let i = 0; i < S.length; i++) wake(i);
    for (let k = 0; k < 40 && active.length; k++) step();
  }
  function rebuild() {
    const w = document.documentElement.clientWidth, h = document.documentElement.scrollHeight;
    const gw = Math.ceil(w / CELL), gh = Math.ceil(h / CELL);
    if (!gw || !gh) return;
    const fresh = gw !== GW || gh !== GH;
    if (fresh) {
      GW = gw; GH = gh;
      S = new Uint8Array(GW * GH); ledge = new Uint8Array(GW * GH); cap = new Uint8Array(GW * GH); queued = new Uint8Array(GW * GH);
      img = new ImageData(GW, GH); pix = new Uint32Array(img.data.buffer); active = [];
      layer = Object.assign(document.createElement('canvas'), { width: GW, height: GH });
      shade = Object.assign(document.createElement('canvas'), { width: GW, height: GH });
    }
    buildLedges();
    if (fresh) dust(built ? .25 : .55);
    built = true; dirty = true; request();
  }

  // ---------- 雪片 ----------
  function spawn(f, anywhere) {
    const r = Math.random();
    f.layer = r < .32 ? 0 : r < .9 ? 1 : 2;
    const L = LAYER[f.layer];
    f.size = L.size * (.7 + Math.random() * .6); f.v = L.v * (.8 + Math.random() * .4);
    f.ph = Math.random() * 6.283; f.sw = 6 + Math.random() * 16; f.fr = .3 + Math.random() * .9; f.vx = 0;
    if (!anywhere && storm > .3 && Math.random() < storm * .45) { f.x = -20; f.y = Math.random() * vh; }
    else { f.x = Math.random() * (vw + 80) - 40; f.y = anywhere ? Math.random() * vh : -10 - Math.random() * 60; }
    return f;
  }
  function target() { return Math.round(Math.min(420, Math.max(90, vw * vh / 4200)) * (1 + storm * 1.8)); }
  function updateFlakes(dt, now) {
    const want = target();
    while (flakes.length < want) flakes.push(spawn({}, false));
    const wind = Math.sin(now / 6800) * 9 + Math.sin(now / 2100) * 4 + storm * (190 + Math.sin(now / 900) * 50);
    const fresh = now - pointer.t < 160, sy = scrollY;
    for (let n = flakes.length - 1; n >= 0; n--) {
      const f = flakes[n];
      f.vx += (wind * (.55 + f.layer * .3) - f.vx) * Math.min(1, dt * 1.4);
      if (fresh) {
        const dx = f.x - pointer.x, dy = f.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 14400) { const k = (1 - Math.sqrt(d2) / 120) * dt * 6; f.vx += pointer.vx * k; f.y += pointer.vy * k * .02; }
      }
      f.x += (f.vx + Math.sin(now / 1000 * f.fr + f.ph) * f.sw * (1 - storm * .5)) * dt;
      f.y += f.v * (1 + storm * 1.1) * dt;
      if (f.layer === 1 && Math.random() < .85) { if (land(f.x, f.y + sy)) { if (flakes.length > want) flakes.splice(n, 1); else spawn(f, false); continue; } }
      if (f.y > vh + 12 || f.x > vw + 60 || f.x < -70) { if (flakes.length > want) flakes.splice(n, 1); else spawn(f, false); }
    }
  }
  function updatePuffs(dt) {
    for (let n = puffs.length - 1; n >= 0; n--) {
      const p = puffs[n];
      p.vy += 260 * dt; p.vx *= 1 - dt * 1.5; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * .9;
      if (p.life <= 0) puffs.splice(n, 1);
    }
  }

  // ---------- 畫 ----------
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    const sy = scrollY, sx = scrollX;
    if (GW) {
      if (dirty) {
        layer.getContext('2d').putImageData(img, 0, 0);
        const sg = shade.getContext('2d');
        sg.globalCompositeOperation = 'copy'; sg.drawImage(layer, 0, 0);
        sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#8c9aa6'; sg.fillRect(0, 0, GW, GH);
        dirty = false;
      }
      const gy0 = Math.max(0, Math.floor(sy / CELL) - 1), gy1 = Math.min(GH, Math.ceil((sy + vh) / CELL) + 1);
      if (gy1 > gy0) {
        const y = gy0 * CELL - sy, hh = (gy1 - gy0) * CELL;
        ctx.imageSmoothingEnabled = true;
        ctx.globalAlpha = .5; ctx.drawImage(shade, 0, gy0, GW, gy1 - gy0, -sx, y + 1.6, GW * CELL, hh);
        ctx.globalAlpha = 1; ctx.drawImage(layer, 0, gy0, GW, gy1 - gy0, -sx, y, GW * CELL, hh);
      }
    }
    for (const f of flakes) {
      const r = f.size * 1.6, s = sprites[f.layer];
      ctx.globalAlpha = LAYER[f.layer].alpha;
      ctx.drawImage(s, f.x - r, f.y - r, r * 2, r * 2);
    }
    for (const p of puffs) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.drawImage(sprites[0], p.x - sx - 2, p.y - sy - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    storm += (stormTarget - storm) * Math.min(1, dt * .9);
    if (built && !frozen) {
      if (reduced) for (let k = 0; k < 60 && active.length; k++) step();
      else { updateFlakes(dt, now); step(); if (storm > .4) step(); updatePuffs(dt); }
    }
    draw();
    if (!frozen && (!reduced || active.length)) request();
  }
  function request() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = document.documentElement.clientWidth; vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
    if (reduced && !flakes.length) for (let n = 0; n < target() * .6; n++) flakes.push(spawn({}, true));
    request();
  }

  // ---------- 拂雪與風 ----------
  addEventListener('pointermove', e => {
    const now = performance.now(), dt = Math.max(16, now - pointer.t) / 1000;
    if (now - pointer.t < 200) { pointer.vx = (e.clientX - pointer.x) / dt; pointer.vy = (e.clientY - pointer.y) / dt; }
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = now;
    if (GW && (e.buttons & 1 || e.pointerType === 'touch')) brush(e.clientX + scrollX, e.clientY + scrollY, e.pointerType === 'touch' ? 20 : 16);
  }, { passive: true });
  addEventListener('pointerdown', e => { if (GW) brush(e.clientX + scrollX, e.clientY + scrollY, e.pointerType === 'touch' ? 26 : 16); }, { passive: true });
  addEventListener('scroll', () => { if (frozen || reduced) request(); }, { passive: true });
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = performance.now(); request(); } });

  let rebuildT = 0;
  const later = () => { if (!built) return; clearTimeout(rebuildT); rebuildT = setTimeout(rebuild, 120); };
  new ResizeObserver(later).observe(document.querySelector('.page'));
  const watch = new MutationObserver(later);
  for (const el of document.querySelectorAll('[data-snow]')) watch.observe(el, { childList: true, characterData: true, subtree: true });
  document.fonts?.addEventListener?.('loadingdone', later);

  resize();
  return {
    rebuild,
    setStorm(v) { stormTarget = v; request(); },
    setFrozen(v) { frozen = v; last = performance.now(); request(); },
  };
}
