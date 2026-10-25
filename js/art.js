'use strict';
// ============================================================
//  Gráficos: todo se dibuja con formas (sin imágenes)
// ============================================================
const PAL = { suit: '#27306a', suitDark: '#1a2048', skin: '#f3c99d', band: '#e63946' };

const TILESET = {
  city: {
    ground: '#5b5f6b', groundTop: '#a2a8b3', groundDark: '#474a54',
    block: '#a5543c', blockDark: '#7a3a28', window: '#ffd86b', windowOff: '#3b2f4a',
    plat: '#e08a2c', platDark: '#9c5a12', spike: '#d4dae0', liquid: '#3fbf63',
  },
  forest: {
    ground: '#7a5230', groundTop: '#5cc24a', groundDark: '#5c3c22',
    block: '#7f8c7a', blockDark: '#5e6a59', moss: '#5cc24a',
    plat: '#8b5a2b', platDark: '#5e3b1a', spike: '#3f6b2a', liquid: '#3aa0e0',
  },
  castle: {
    ground: '#6d6a7a', groundTop: '#9592a6', groundDark: '#4e4b5a',
    block: '#57536b', blockDark: '#3d3a4d',
    plat: '#8b5a2b', platDark: '#5e3b1a', spike: '#d4dae0', liquid: '#ff6a1a',
  },
};

const Art = {
  grads: {},

  // ---------- utilidades ----------
  rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
    else ctx.rect(x, y, w, h);
  },
  box(ctx, x, y, w, h, r, color) { ctx.fillStyle = color; this.rr(ctx, x, y, w, h, r); ctx.fill(); },
  circle(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); ctx.fill(); },
  ellipse(ctx, x, y, rx, ry, color, rot = 0) {
    ctx.fillStyle = color; ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); ctx.fill();
  },
  poly(ctx, pts, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); ctx.fill();
  },
  line(ctx, x1, y1, x2, y2, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  },
  hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); },
  text(ctx, str, x, y, size = 20, color = '#fff', align = 'center', stroke = '#1b1030') {
    ctx.font = `bold ${size}px "Trebuchet MS", Verdana, sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 5); ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  },
  grad(ctx, key, stops) {
    if (!this.grads[key]) {
      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      for (let i = 0; i < stops.length; i += 2) g.addColorStop(stops[i + 1], stops[i]);
      this.grads[key] = g;
    }
    return this.grads[key];
  },

  // ============================================================
  //  FONDOS con paralaje
  // ============================================================
  background(ctx, theme, camX, f, camY = 0) {
    if (theme === 'hell') this.bgHell(ctx, camX, f, camY);
    else if (theme === 'city') this.bgCity(ctx, camX, f);
    else if (theme === 'forest') this.bgForest(ctx, camX, f);
    else if (theme === 'beach') this.bgBeach(ctx, camX, f);
    else if (theme === 'ice') this.bgIce(ctx, camX, f);
    else if (theme === 'volcano') this.bgVolcano(ctx, camX, f);
    else this.bgCastle(ctx, camX, f);
  },

  bgCity(ctx, camX) {
    ctx.fillStyle = this.grad(ctx, 'city', ['#2b2160', 0, '#7b3f8c', 0.45, '#ef7d6b', 0.8, '#ffc27a', 1]);
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.circle(ctx, 760 - camX * 0.02, 330, 80, 'rgba(255,214,140,0.9)');
    this.skyline(ctx, camX * 0.15, 90, 120, 200, '#4a2f6e', null, 1);
    this.skyline(ctx, camX * 0.35, 120, 80, 230, '#2c1f4d', '#ffd36b', 2);
  },
  skyline(ctx, off, spacing, minH, varH, color, winColor, seed) {
    const first = Math.floor(off / spacing) - 1;
    for (let i = first; i < first + Math.ceil(VIEW_W / spacing) + 3; i++) {
      const h = minH + this.hash(i * 3.1 + seed) * varH;
      const w = spacing * (0.62 + this.hash(i * 7.7 + seed) * 0.33);
      const x = i * spacing - off, y = VIEW_H - 40 - h;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h + 40);
      if (this.hash(i + seed * 5) > 0.6) ctx.fillRect(x + w * 0.4, y - 22, 4, 22);
      if (winColor) {
        let r = 0;
        for (let wy = y + 12; wy < VIEW_H - 50; wy += 22, r++) {
          let c = 0;
          for (let wx = x + 8; wx < x + w - 12; wx += 16, c++) {
            if (this.hash(i * 31 + r * 7.3 + c * 13.7) > 0.55) { ctx.fillStyle = winColor; ctx.fillRect(wx, wy, 7, 10); }
          }
        }
      }
    }
  },

  bgForest(ctx, camX, f) {
    ctx.fillStyle = this.grad(ctx, 'forest', ['#5fb8f5', 0, '#bfe9ff', 0.7, '#e8f8ff', 1]);
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // nubes
    for (let i = 0; i < 5; i++) {
      const x = ((i * 260 - camX * 0.05 + f * 0.15) % (VIEW_W + 300) + VIEW_W + 300) % (VIEW_W + 300) - 150;
      const y = 60 + this.hash(i) * 90;
      this.ellipse(ctx, x, y, 50, 18, 'rgba(255,255,255,0.85)');
      this.ellipse(ctx, x + 30, y - 10, 34, 18, 'rgba(255,255,255,0.85)');
    }
    // montañas
    const off = camX * 0.1, sp = 260;
    const first = Math.floor(off / sp) - 1;
    for (let i = first; i < first + 7; i++) {
      const x = i * sp - off, h = 160 + this.hash(i * 2.3) * 120;
      this.poly(ctx, [x - 60, VIEW_H - 60, x + sp / 2, VIEW_H - 60 - h, x + sp + 60, VIEW_H - 60], '#8fbfa0');
      this.poly(ctx, [x + sp / 2 - 34, VIEW_H - 60 - h + 40, x + sp / 2, VIEW_H - 60 - h, x + sp / 2 + 34, VIEW_H - 60 - h + 40], '#ffffff');
    }
    // dragones lejanos
    for (let k = 0; k < 2; k++) {
      const x = ((f * (0.6 + k * 0.3) + k * 500) % (VIEW_W + 200)) - 100;
      const y = 110 + k * 50 + Math.sin(f * 0.03 + k) * 10;
      ctx.save(); ctx.translate(x, y); ctx.scale(0.8, 0.8);
      this.dragon(ctx, 1, { body: 'rgba(60,90,80,0.55)', belly: 'rgba(60,90,80,0.55)', wing: 'rgba(60,90,80,0.55)', wingDark: 'rgba(60,90,80,0.4)', horn: 'rgba(60,90,80,0.55)', spike: 'rgba(60,90,80,0.55)' }, f + k * 20, 'none');
      ctx.restore();
    }
    this.trees(ctx, camX * 0.3, 70, '#5a9a5e', '#4b7d4e', 0.8, 1);
    this.trees(ctx, camX * 0.55, 130, '#2f6e3c', '#3f2a1a', 1.3, 2);
  },
  trees(ctx, off, sp, leaf, trunk, s, seed) {
    const first = Math.floor(off / sp) - 1;
    for (let i = first; i < first + Math.ceil(VIEW_W / sp) + 3; i++) {
      const x = i * sp - off + this.hash(i + seed) * 20;
      const h = (90 + this.hash(i * 3 + seed) * 70) * s;
      ctx.fillStyle = trunk; ctx.fillRect(x - 5 * s, VIEW_H - 50 - h * 0.5, 10 * s, h * 0.5 + 50);
      this.circle(ctx, x, VIEW_H - 50 - h * 0.65, 34 * s, leaf);
      this.circle(ctx, x - 22 * s, VIEW_H - 50 - h * 0.45, 26 * s, leaf);
      this.circle(ctx, x + 22 * s, VIEW_H - 50 - h * 0.48, 26 * s, leaf);
    }
  },

  bgCastle(ctx, camX, f) {
    ctx.fillStyle = this.grad(ctx, 'castle', ['#141233', 0, '#3b2a66', 0.5, '#a8577a', 0.85, '#e98a6b', 1]);
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 50; i++) {
      const x = this.hash(i * 1.7) * VIEW_W, y = this.hash(i * 2.9) * 260;
      const a = 0.4 + 0.4 * Math.sin(f * 0.05 + i);
      ctx.fillStyle = `rgba(255,255,230,${a})`;
      ctx.fillRect(x, y, 2, 2);
    }
    const mx = 740 - camX * 0.01;
    this.circle(ctx, mx, 100, 42, '#fff3c4');
    this.circle(ctx, mx - 12, 92, 8, '#efe0a8');
    this.circle(ctx, mx + 14, 112, 6, '#efe0a8');
    const off = camX * 0.12, sp = 420;
    const first = Math.floor(off / sp) - 1;
    for (let i = first; i < first + 5; i++) this.castleSil(ctx, i * sp - off + 60, VIEW_H - 80, 0.9 + this.hash(i) * 0.4, '#2b2347', f);
    const off2 = camX * 0.3;
    for (let i = Math.floor(off2 / 300) - 1; i < Math.floor(off2 / 300) + 5; i++) {
      this.ellipse(ctx, i * 300 - off2, VIEW_H - 40, 220, 90, '#231c3d');
    }
  },
  castleSil(ctx, x, baseY, s, color, f) {
    ctx.fillStyle = color;
    ctx.fillRect(x, baseY - 90 * s, 160 * s, 90 * s + 80);
    for (let k = 0; k < 8; k++) ctx.fillRect(x + k * 20 * s, baseY - 100 * s, 12 * s, 10 * s);
    for (const tx of [-20, 70, 160]) {
      const th = (tx === 70 ? 190 : 140) * s;
      ctx.fillRect(x + tx * s, baseY - th, 34 * s, th + 80);
      this.poly(ctx, [x + (tx - 6) * s, baseY - th, x + (tx + 17) * s, baseY - th - 50 * s, x + (tx + 40) * s, baseY - th], color);
      ctx.fillStyle = 'rgba(255,200,90,0.7)';
      ctx.fillRect(x + (tx + 13) * s, baseY - th + 30 * s, 8 * s, 12 * s);
      ctx.fillStyle = color;
      if (tx === 70) {
        ctx.fillRect(x + (tx + 16) * s, baseY - th - 80 * s, 2, 32 * s);
        this.poly(ctx, [x + (tx + 18) * s, baseY - th - 80 * s, x + (tx + 40) * s, baseY - th - 74 * s + Math.sin(f * 0.1) * 2, x + (tx + 18) * s, baseY - th - 66 * s], '#8e2b4a');
        ctx.fillStyle = color;
      }
    }
  },

  // ============================================================
  //  CASILLAS
  // ============================================================
  tiles(ctx, level, camX, f, camY = 0) {
    const ts = TILESET[level.theme];
    const c0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const c1 = Math.min(level.width - 1, c0 + Math.ceil(VIEW_W / TILE) + 2);
    const r0 = Math.max(0, Math.floor(camY / TILE) - 1);
    const r1 = Math.min(level.rows || ROWS, r0 + ROWS + 2);
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = level.tiles[r * level.width + c];
        if (!t) continue;
        const x = c * TILE, y = r * TILE;
        switch (t) {
          case T.GROUND: this.tGround(ctx, level, ts, c, r, x, y); break;
          case T.BLOCK: this.tBlock(ctx, level, ts, c, r, x, y); break;
          case T.PLATFORM: this.tPlat(ctx, level.theme, ts, c, x, y); break;
          case T.SPIKES: this.tSpikes(ctx, level.theme, ts, x, y); break;
          case T.LIQUID: this.tLiquid(ctx, level, ts, c, r, x, y, f); break;
        }
      }
    }
  },

  tGround(ctx, level, ts, c, r, x, y) {
    if (EXTRA_THEMES.has(level.theme)) return this.tGroundX(ctx, level, ts, c, r, x, y);
    const above = tileAt(level, c, r - 1);
    const top = !(above === T.GROUND || above === T.BLOCK);
    ctx.fillStyle = ts.ground; ctx.fillRect(x, y, TILE, TILE);
    if (level.theme === 'city') {
      ctx.fillStyle = ts.groundDark;
      ctx.fillRect(x, y + TILE - 2, TILE, 2);
      if (this.hash(c * 3 + r) > 0.6) ctx.fillRect(x + 8, y + 12, 6, 3);
      if (top) {
        ctx.fillStyle = ts.groundTop; ctx.fillRect(x, y, TILE, 9);
        ctx.fillStyle = '#7c828d'; ctx.fillRect(x, y + 9, TILE, 2);
        ctx.fillStyle = '#8a909b'; ctx.fillRect(x + TILE - 2, y, 2, 9);
      }
    } else if (level.theme === 'forest') {
      ctx.fillStyle = ts.groundDark;
      this.circle(ctx, x + 8 + this.hash(c + r * 7) * 16, y + 12 + this.hash(c * 5 + r) * 14, 3, ts.groundDark);
      if (top) {
        ctx.fillStyle = ts.groundTop; ctx.fillRect(x, y, TILE, 10);
        ctx.fillStyle = '#48a23a';
        for (let i = 0; i < 4; i++) this.poly(ctx, [x + i * 8, y + 10, x + i * 8 + 4, y + 15, x + i * 8 + 8, y + 10], '#48a23a');
        this.poly(ctx, [x + 6, y, x + 8, y - 5, x + 10, y], '#7ad66a');
        this.poly(ctx, [x + 20, y, x + 23, y - 6, x + 25, y], '#7ad66a');
      }
    } else {
      ctx.fillStyle = ts.groundDark;
      ctx.fillRect(x, y + 15, TILE, 2);
      ctx.fillRect(x, y + TILE - 1, TILE, 1);
      ctx.fillRect(x + (r % 2 ? 0 : 16), y, 2, 15);
      ctx.fillRect(x + (r % 2 ? 16 : 0), y + 17, 2, 15);
      if (top) { ctx.fillStyle = ts.groundTop; ctx.fillRect(x, y, TILE, 6); }
    }
  },

  tBlock(ctx, level, ts, c, r, x, y) {
    if (EXTRA_THEMES.has(level.theme)) return this.tBlockX(ctx, level, ts, c, r, x, y);
    const above = tileAt(level, c, r - 1);
    const top = !(above === T.GROUND || above === T.BLOCK);
    if (level.theme === 'city') {
      ctx.fillStyle = ts.block; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = ts.blockDark;
      ctx.fillRect(x, y + 10, TILE, 1); ctx.fillRect(x, y + 21, TILE, 1);
      ctx.fillStyle = this.hash(c * 7 + r * 3) > 0.45 ? ts.window : ts.windowOff;
      ctx.fillRect(x + 9, y + 7, 14, 17);
      ctx.fillStyle = ts.blockDark; ctx.fillRect(x + 15, y + 7, 2, 17);
      if (top) { ctx.fillStyle = '#c7c0b8'; ctx.fillRect(x - 1, y, TILE + 2, 5); }
    } else if (level.theme === 'forest') {
      this.box(ctx, x + 1, y + 1, TILE - 2, TILE - 2, 6, ts.block);
      this.box(ctx, x + 4, y + 18, TILE - 8, 10, 4, ts.blockDark);
      if (top) { this.box(ctx, x, y, TILE, 9, 4, ts.moss); }
    } else {
      ctx.fillStyle = ts.block; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = ts.blockDark;
      ctx.fillRect(x, y + 15, TILE, 2); ctx.fillRect(x + (r % 2 ? 4 : 20), y, 2, 15); ctx.fillRect(x + (r % 2 ? 20 : 4), y + 17, 2, 15);
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(x, y, TILE, 3);
      if (top) {
        ctx.fillStyle = ts.block;
        ctx.fillRect(x + 2, y - 8, 12, 8); ctx.fillRect(x + 18, y - 8, 12, 8);
      }
    }
  },

  tPlat(ctx, theme, ts, c, x, y) {
    if (EXTRA_THEMES.has(theme)) return this.tPlatX(ctx, theme, ts, c, x, y);
    if (theme === 'city') {
      ctx.fillStyle = ts.plat; ctx.fillRect(x, y, TILE, 10);
      ctx.fillStyle = ts.platDark; ctx.fillRect(x, y + 10, TILE, 3);
      this.circle(ctx, x + 8, y + 5, 2.5, ts.platDark); this.circle(ctx, x + 24, y + 5, 2.5, ts.platDark);
    } else if (theme === 'forest') {
      this.box(ctx, x - 1, y, TILE + 2, 12, 6, ts.plat);
      ctx.fillStyle = ts.platDark; ctx.fillRect(x + 4, y + 4, 10, 2); ctx.fillRect(x + 18, y + 7, 9, 2);
      if (this.hash(c) > 0.6) this.ellipse(ctx, x + 20, y - 1, 6, 3, '#5cc24a');
    } else {
      ctx.fillStyle = ts.plat; ctx.fillRect(x, y, TILE, 10);
      ctx.fillStyle = ts.platDark; ctx.fillRect(x, y + 10, TILE, 3); ctx.fillRect(x + 15, y, 2, 10);
      this.circle(ctx, x + 5, y + 5, 1.5, '#ccc'); this.circle(ctx, x + 27, y + 5, 1.5, '#ccc');
    }
  },

  tSpikes(ctx, theme, ts, x, y) {
    if (EXTRA_THEMES.has(theme)) return this.tSpikesX(ctx, theme, ts, x, y);
    if (theme === 'forest') {
      this.ellipse(ctx, x + 16, y + 26, 17, 9, '#2f5a20');
      for (let i = 0; i < 5; i++) this.poly(ctx, [x + 2 + i * 6, y + 22, x + 5 + i * 6, y + 12, x + 8 + i * 6, y + 22], '#c9e7a0');
    } else {
      for (let i = 0; i < 4; i++) {
        this.poly(ctx, [x + i * 8, y + TILE, x + i * 8 + 4, y + 14, x + i * 8 + 8, y + TILE], ts.spike);
        this.poly(ctx, [x + i * 8 + 4, y + TILE, x + i * 8 + 4, y + 14, x + i * 8 + 8, y + TILE], 'rgba(0,0,0,0.25)');
      }
    }
  },

  tLiquid(ctx, level, ts, c, r, x, y, f) {
    if (level.theme === 'ice') return this.tLiquidIce(ctx, level, ts, c, r, x, y, f);
    const top = tileAt(level, c, r - 1) !== T.LIQUID;
    ctx.fillStyle = ts.liquid;
    if (top) {
      const w1 = Math.sin((x + f * 2) * 0.05) * 3;
      ctx.fillRect(x, y + 6 + w1, TILE, TILE - 6 - w1);
      ctx.fillStyle = LAVA_LOOK.has(level.theme) ? '#ffd23f' : 'rgba(255,255,255,0.6)';
      ctx.fillRect(x, y + 5 + w1, TILE, 3);
      if (LAVA_LOOK.has(level.theme) && this.hash(c + Math.floor(f / 30)) > 0.85) this.circle(ctx, x + 16, y + 4 + w1, 4, '#ffd23f');
    } else ctx.fillRect(x, y, TILE, TILE);
  },

  // ============================================================
  //  EL NINJA
  // ============================================================
  player(ctx, p) {
    if (!p.dead && p.invuln > 0 && Math.floor(p.invuln / 4) % 2 === 0) return;
    const armor = p.inv.armor ? ARMORS[p.inv.armor] : null;
    ctx.save();
    ctx.translate(Math.round(p.x + p.w / 2), Math.round(p.y + p.h));
    ctx.scale(p.facing, 1);
    if (p.dead) { ctx.translate(0, -23); ctx.rotate(Math.PI); ctx.translate(0, 23); }
    else if (p.flip > 0) { ctx.translate(0, -23); ctx.rotate((1 - p.flip / 24) * Math.PI * 2); ctx.translate(0, 23); }

    const moving = p.onGround && Math.abs(p.vx) > 0.4;
    const ph = moving ? Math.sin(p.anim * 0.4) : 0;
    const air = !p.onGround && !p.dead;

    // cintas de la cinta de la cabeza
    const wv = Math.sin(p.anim * 0.25) * 3;
    const tr = Math.min(1, Math.abs(p.vx) / 4) * 5;
    ctx.strokeStyle = PAL.band; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, -46); ctx.quadraticCurveTo(-16, -48 + wv, -22 - tr, -44 + wv * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -45); ctx.quadraticCurveTo(-15, -42 - wv, -20 - tr, -38 - wv); ctx.stroke();

    // alas de energía al volar con la espada láser
    if (p.flying) {
      const fl = Math.sin(p.anim * 0.8) * 0.35;
      for (const [rot, col] of [[-0.5 - fl, 'rgba(255,77,210,0.7)'], [-0.9 + fl, 'rgba(125,249,255,0.7)']]) {
        ctx.save(); ctx.translate(-6, -30); ctx.rotate(rot);
        this.ellipse(ctx, -14, 0, 16, 6, col);
        ctx.restore();
      }
    }
    if (p.inv.escudo) this.shieldItem(ctx, -9, -27, 9);

    // piernas
    this.leg(ctx, air ? -0.7 : -ph * 0.7, PAL.suitDark, air ? -2 : 0);
    this.leg(ctx, air ? 0.5 : ph * 0.7, PAL.suit, 0);

    // cuerpo
    this.box(ctx, -9, -33, 18, 19, 6, PAL.suit);
    if (armor) {
      this.box(ctx, -10, -32, 20, 14, 5, armor.color);
      ctx.fillStyle = armor.dark; ctx.fillRect(-10, -24, 20, 2);
      ctx.fillStyle = armor.shine; ctx.fillRect(-6, -30, 3, 5);
    }
    ctx.fillStyle = '#111'; ctx.fillRect(-9, -17, 18, 3);
    this.box(ctx, -3, -18.5, 5, 5, 1, PAL.band);

    // cabeza
    this.circle(ctx, 0, -41, 10, PAL.suit);
    this.box(ctx, -1, -45, 10, 7, 3, PAL.skin);
    ctx.fillStyle = '#111';
    if (p.dead) { ctx.fillRect(2.5, -43, 3, 1.5); ctx.fillRect(6.5, -43, 3, 1.5); }
    else { ctx.fillRect(3, -43.5, 2.2, 3.2); ctx.fillRect(6.6, -43.5, 2.2, 3.2); }
    ctx.fillStyle = PAL.band; ctx.fillRect(-9.5, -49, 19, 4);
    if (armor) {
      ctx.fillStyle = armor.color;
      ctx.beginPath(); ctx.arc(0, -43, 11.5, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
      ctx.fillStyle = armor.dark; ctx.fillRect(-12, -46.5, 24, 2.5);
      this.poly(ctx, [-3, -54, 0, -60, 3, -54], armor.shine);
    }

    this.heldWeapon(ctx, p);

    if (p.slow > 0) { ctx.globalAlpha = 0.35; this.box(ctx, -13, -56, 26, 56, 6, '#bdefff'); ctx.globalAlpha = 1; }
    ctx.restore();
  },
  leg(ctx, ang, color, lift) {
    ctx.save(); ctx.translate(0, -16 + lift); ctx.rotate(ang);
    this.box(ctx, -3.5, 0, 7, 15, 3, color);
    this.box(ctx, -3.5, 12, 10, 4, 2, '#151515');
    ctx.restore();
  },
  heldWeapon(ctx, p) {
    const id = p.inv.weapon;
    const W = WEAPONS[id];
    const k = p.attackTimer > 0 ? 1 - p.attackTimer / (W.duration || 10) : -1;
    let ang;
    if (W.type === 'melee') {
      if (k < 0) ang = -1.1;
      else if (W.both) ang = -1.6 + k * Math.PI * 2;
      else ang = -2.0 + k * 2.9;
    } else ang = k < 0 ? 0.6 : -0.1;

    // estela del golpe
    if (k >= 0 && W.type === 'melee') {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath();
      if (W.both) ctx.arc(2, -29, W.range * 0.8, 0, Math.PI * 2);
      else ctx.arc(2, -29, W.range * 0.85, -2.0, ang);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(2, -29);
    ctx.rotate(ang);
    this.box(ctx, -3, -3, 14, 6, 3, PAL.suit);
    ctx.translate(13, 0);
    switch (id) {
      case 'baston':
        this.box(ctx, -22, -2.5, 62, 5, 2, '#a0703f');
        ctx.fillStyle = '#5e3b1a'; ctx.fillRect(-22, -2.5, 5, 5); ctx.fillRect(35, -2.5, 5, 5);
        break;
      case 'espada':
        ctx.fillStyle = '#5e3b1a'; ctx.fillRect(-9, -2, 9, 4);
        ctx.fillStyle = '#d4a017'; ctx.fillRect(-1, -7, 4, 14);
        this.poly(ctx, [3, -3.5, 36, -3.5, 44, 0, 36, 3.5, 3, 3.5], '#e2e8ef');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(5, -2, 28, 1.5);
        break;
      case 'lunchacos': {
        this.box(ctx, -2, -2.5, 18, 5, 2, '#b5651d');
        ctx.save(); ctx.translate(18, 0);
        const sw = k < 0 ? 1.1 : Math.sin(k * 24) * 1.4;
        ctx.rotate(sw);
        ctx.fillStyle = '#ccc'; for (let i = 0; i < 3; i++) ctx.fillRect(i * 3, -1, 2, 2);
        this.box(ctx, 8, -2.5, 18, 5, 2, '#b5651d');
        ctx.restore();
        this.circle(ctx, 0, 0, 3.5, PAL.skin);
        break;
      }
      case 'estrellas':
        if (k < 0 || k > 0.5) this.shuriken(ctx, 4, 0, 7, p.anim * 0.1);
        this.circle(ctx, 0, 0, 3.5, PAL.skin);
        break;
      case 'arco':
        ctx.rotate(-ang);
        ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(-6, 0, 18, -1.15, 1.15); ctx.stroke();
        ctx.strokeStyle = '#eee'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-6 + 18 * Math.cos(-1.15), 18 * Math.sin(-1.15));
        ctx.lineTo(k >= 0 && k < 0.3 ? -10 : -2, 0); ctx.lineTo(-6 + 18 * Math.cos(1.15), 18 * Math.sin(1.15)); ctx.stroke();
        if (p.attackCooldown < 6) { this.line(ctx, -2, 0, 22, 0, '#c8a165', 2); this.poly(ctx, [22, -3, 28, 0, 22, 3], '#ccc'); }
        this.circle(ctx, 0, 0, 3.5, PAL.skin);
        break;
    }
    if (id === 'espadaFuego' || id === 'espadaHielo') this.elementSword(ctx, id === 'espadaFuego' ? 'fire' : 'ice', p.anim);
    if (id === 'espadaLaser') this.laserSword(ctx, p.anim);
    if (id === 'baston' || id === 'espada' || id === 'espadaFuego' || id === 'espadaHielo' || id === 'espadaLaser') this.circle(ctx, 0, 0, 3.5, PAL.skin);
    ctx.restore();
  },
  shuriken(ctx, x, y, r, rot, color = '#d0d8e2') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, rr = i % 2 === 0 ? r : r * 0.35;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    this.circle(ctx, 0, 0, r * 0.18, '#333');
    ctx.restore();
  },

  // ============================================================
  //  ENEMIGOS
  // ============================================================
  enemy(ctx, e) {
    if (e.kind === 'arana') this.line(ctx, e.x + e.w / 2, e.anchorY, e.x + e.w / 2, e.y + 8, 'rgba(240,240,240,0.8)', 1.5);
    ctx.save();
    ctx.translate(Math.round(e.x + e.w / 2), Math.round(e.y + e.h));
    if (e.state === 'warn' || e.state === 'crouch') ctx.translate((Math.random() - 0.5) * 3, 0);
    ctx.scale(e.facing, 1);
    if (e.hurtT > 0 && e.hurtT % 4 < 2) ctx.globalAlpha = 0.45;
    switch (e.kind) {
      case 'lobo': this.quad(ctx, e, { body: '#8a8f98', dark: '#6b7079', belly: '#c9ccd1', snout: '#b5b9c0', tailW: 7, eye: '#d4a017', pointy: true }); break;
      case 'tigre': this.quad(ctx, e, { body: '#f08c2a', dark: '#c96d14', belly: '#fff3e0', snout: '#fff3e0', stripes: '#222', eye: '#2e7d32' }); break;
      case 'leon': this.quad(ctx, e, { body: '#e0b04f', dark: '#b98a2f', belly: '#f3d48a', snout: '#f3d48a', mane: '#8d4f1f', tailTip: '#8d4f1f', eye: '#5d3a00' }); break;
      case 'guepardo': this.quad(ctx, e, { body: '#f2c65a', dark: '#cfa33a', belly: '#fff3d0', snout: '#fff3d0', spots: '#3b2a1a', legSpeed: 1.7, eye: '#6b3e00' }); break;
      case 'rinoceronte': this.quad(ctx, e, { body: '#8c97a3', dark: '#6c7682', snout: '#9aa5b1', horn: '#f1ead8', head: 1.1, eye: '#222', tailW: 3 }); break;
      case 'hipopotamo': this.quad(ctx, e, { body: '#9b7fa6', dark: '#7a6185', belly: '#c3a6c9', snout: '#c3a6c9', head: 1.2, eye: '#222', tailW: 3, bigSnout: true }); break;
      case 'piton': this.python(ctx, e); break;
      case 'arana': this.spider(ctx, e); break;
      case 'murcielago': this.bat(ctx, e); break;
      case 'mosquito': this.mosquito(ctx, e); break;
      case 'miniMetal': this.metal(ctx, e.w, e.h, e.t, Math.abs(e.vx) > 0.1, false); break;
      case 'dragoncito':
        ctx.translate(0, -e.h / 2);
        this.dragon(ctx, 1, { body: '#d9452b', belly: '#ffcf8a', wing: '#a82d1a', wingDark: '#7a1e10', horn: '#fff3d6', spike: '#ffcf8a' }, e.t, 'angry');
        break;
      case 'caballerito':
        this.knight(ctx, e.w, e.h, e.t, { armor: '#b8c0c8', dark: '#8a939c', tabard: '#2f6fb0', cross: '#f5f5f5', plume: '#e63946', shield: '#2f6fb0', sword: 26 }, { walking: true });
        break;
      case 'escorpion': this.scorpion(ctx, e); break;
      case 'osoPolar': this.quad(ctx, e, { body: '#f4f7fa', dark: '#d3dde6', belly: '#ffffff', snout: '#e6edf2', head: 1.05, eye: '#222', tailW: 3 }); break;
      case 'monstruitoFuego': this.fireling(ctx, e); break;
      case 'diablillo': this.imp(ctx, e); break;
    }
    if (e.frozen > 0) {
      ctx.globalAlpha = 0.55;
      this.box(ctx, -e.w / 2 - 4, -e.h - 6, e.w + 8, e.h + 6, 6, '#bdefff');
      ctx.globalAlpha = 0.9;
      this.line(ctx, -e.w / 2 + 2, -e.h, -e.w / 2 + 10, -e.h + 10, '#ffffff', 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  },

  // Cuadrúpedo genérico (lobo, tigre, león, guepardo, rino, hipo)
  quad(ctx, e, c) {
    const w = e.w, h = e.h;
    const L = h * 0.34, bh = h * 0.52, by = -L - bh / 2 + 3, rx = w * 0.4;
    const moving = Math.abs(e.vx) > 0.1 || e.state === 'leap';
    const sw = moving ? Math.sin(e.t * 0.35 * (c.legSpeed || 1)) * 4 : 0;
    // cola
    ctx.strokeStyle = c.body; ctx.lineWidth = c.tailW || 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-rx + 3, by - 2);
    ctx.quadraticCurveTo(-rx - 10, by - 12 + sw, -rx - 14, by - 4 + sw); ctx.stroke();
    if (c.tailTip) this.circle(ctx, -rx - 14, by - 4 + sw, 4, c.tailTip);
    // patas traseras
    this.box(ctx, -w * 0.3 - sw - 3.5, -L - 2, 7, L + 2, 2, c.dark);
    this.box(ctx, w * 0.16 + sw - 3.5, -L - 2, 7, L + 2, 2, c.dark);
    // cuerpo
    this.ellipse(ctx, -w * 0.04, by, rx, bh / 2, c.body);
    if (c.belly) this.ellipse(ctx, -w * 0.02, by + bh * 0.22, rx * 0.75, bh * 0.22, c.belly);
    if (c.stripes || c.spots) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(-w * 0.04, by, rx, bh / 2, 0, 0, Math.PI * 2); ctx.clip();
      if (c.stripes) for (let i = 0; i < 4; i++) { ctx.fillStyle = c.stripes; ctx.fillRect(-rx * 0.8 + i * rx * 0.42, by - bh / 2, 4, bh * 0.5); }
      if (c.spots) for (let i = 0; i < 9; i++) this.circle(ctx, -rx + this.hash(i * 3.3) * rx * 1.9, by - bh / 2 + this.hash(i * 5.1) * bh * 0.8, 2.2, c.spots);
      ctx.restore();
    }
    // patas delanteras
    this.box(ctx, -w * 0.24 + sw - 3.5, -L - 2, 7, L + 2, 2, c.body);
    this.box(ctx, w * 0.22 - sw - 3.5, -L - 2, 7, L + 2, 2, c.body);
    // melena
    const hx = w * 0.34, hy = by - bh * 0.32, hr = h * 0.26 * (c.head || 1);
    if (c.mane) this.circle(ctx, hx - 2, hy, hr * 1.55, c.mane);
    // orejas
    if (c.pointy) this.poly(ctx, [hx - hr * 0.6, hy - hr * 0.5, hx - hr * 0.3, hy - hr * 1.6, hx + hr * 0.1, hy - hr * 0.7], c.dark);
    else { this.circle(ctx, hx - hr * 0.45, hy - hr * 0.8, hr * 0.35, c.dark); }
    // cabeza
    this.circle(ctx, hx, hy, hr, c.body);
    if (c.bigSnout) this.ellipse(ctx, hx + hr * 0.8, hy + hr * 0.3, hr * 0.85, hr * 0.62, c.snout);
    else this.ellipse(ctx, hx + hr * 0.75, hy + hr * 0.28, hr * 0.6, hr * 0.42, c.snout || c.body);
    this.circle(ctx, hx + hr * (c.bigSnout ? 1.4 : 1.25), hy + hr * 0.1, 2.4, '#222');
    if (c.horn) this.poly(ctx, [hx + hr * 0.9, hy - hr * 0.05, hx + hr * 1.45, hy - hr * 1.3, hx + hr * 1.35, hy + hr * 0.1], c.horn);
    // ojo enfadado
    this.circle(ctx, hx + hr * 0.2, hy - hr * 0.3, 3.4, '#fff');
    this.circle(ctx, hx + hr * 0.32, hy - hr * 0.28, 1.9, c.eye || '#222');
    this.line(ctx, hx - hr * 0.15, hy - hr * 0.72, hx + hr * 0.55, hy - hr * 0.5, '#222', 1.6);
    // dientecito
    this.poly(ctx, [hx + hr * 0.9, hy + hr * 0.55, hx + hr * 1.0, hy + hr * 0.85, hx + hr * 1.1, hy + hr * 0.55], '#fff');
  },

  python(ctx, e) {
    const n = 9, seg = e.w / n;
    for (let i = 0; i < n; i++) {
      const x = -e.w / 2 + i * seg + 4;
      const y = -7 - Math.sin(e.t * 0.15 + i * 0.8) * 3;
      const r = i < 3 ? 4 + i * 1.3 : 7;
      this.circle(ctx, x, y, r, i % 2 ? '#4caf50' : '#3b8f3e');
      if (i % 2 === 0) this.circle(ctx, x, y - 2, 2, '#c5e86c');
    }
    const hx = e.w / 2 - 4, hy = -10 - Math.sin(e.t * 0.15 + n * 0.8) * 3;
    this.ellipse(ctx, hx, hy, 11, 8, '#3b8f3e');
    this.circle(ctx, hx + 3, hy - 3, 2.6, '#ffe14d');
    ctx.fillStyle = '#111'; ctx.fillRect(hx + 2.5, hy - 5, 1.2, 4);
    if (e.t % 40 < 20) {
      this.line(ctx, hx + 10, hy + 2, hx + 18, hy + 2, '#e63946', 1.5);
      this.line(ctx, hx + 18, hy + 2, hx + 21, hy, '#e63946', 1.2);
      this.line(ctx, hx + 18, hy + 2, hx + 21, hy + 4, '#e63946', 1.2);
    }
  },

  spider(ctx, e) {
    const cy = -e.h / 2;
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < 4; i++) {
        const a = Math.sin(e.t * 0.2 + i) * 3;
        const x0 = s * 6, y0 = cy + i * 3 - 4;
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(s * (16 + i * 2), y0 - 10 + a); ctx.lineTo(s * (22 + i * 1.5), y0 + 12 + a); ctx.stroke();
      }
    }
    this.circle(ctx, -4, cy, 13, '#2b2b2b');
    this.poly(ctx, [-8, cy - 5, -1, cy - 5, -6, cy, -1, cy + 5, -8, cy + 5, -4, cy], '#e63946');
    this.circle(ctx, 9, cy + 2, 8, '#3a3a3a');
    for (const [x, y] of [[11, -1], [14, 1], [9, 2], [13, 4]]) this.circle(ctx, x, cy + y, 1.6, '#ff3b3b');
    this.line(ctx, 14, cy + 8, 15, cy + 12, '#ddd', 1.5);
  },

  bat(ctx, e) {
    const cy = -e.h / 2, fl = Math.sin(e.t * 0.4);
    this.poly(ctx, [-2, cy, -16, cy - 10 - fl * 8, -20, cy + 2, -12, cy - 1, -9, cy + 6], '#4a2d6b');
    this.poly(ctx, [2, cy, 16, cy - 10 - fl * 8, 20, cy + 2, 12, cy - 1, 9, cy + 6], '#4a2d6b');
    this.ellipse(ctx, 0, cy + 2, 7, 8, '#5b3a80');
    this.poly(ctx, [-5, cy - 4, -4, cy - 11, -1, cy - 5], '#5b3a80');
    this.poly(ctx, [5, cy - 4, 4, cy - 11, 1, cy - 5], '#5b3a80');
    this.circle(ctx, -2.5, cy, 1.8, '#ffe14d'); this.circle(ctx, 2.5, cy, 1.8, '#ffe14d');
    this.poly(ctx, [-2, cy + 5, -1, cy + 8, 0, cy + 5], '#fff'); this.poly(ctx, [0, cy + 5, 1, cy + 8, 2, cy + 5], '#fff');
  },

  mosquito(ctx, e) {
    const cy = -e.h / 2;
    // aura roja = ¡peligro!
    this.circle(ctx, 0, cy, 15 + Math.sin(e.t * 0.2) * 2, `rgba(255,40,40,${0.18 + 0.12 * Math.sin(e.t * 0.2)})`);
    const fl = Math.sin(e.t * 1.3);
    this.ellipse(ctx, -3, cy - 6, 6, 3 + fl * 2, 'rgba(220,240,255,0.75)', -0.5);
    this.ellipse(ctx, 2, cy - 6, 6, 3 - fl * 2, 'rgba(220,240,255,0.75)', 0.5);
    for (let i = 0; i < 3; i++) this.line(ctx, -2 + i * 3, cy + 3, -5 + i * 4, cy + 9, '#3a2f25', 1);
    this.ellipse(ctx, -4, cy + 1, 6, 3.5, '#6b5b4b');
    ctx.fillStyle = '#3a2f25'; ctx.fillRect(-7, cy, 1.5, 3); ctx.fillRect(-4, cy, 1.5, 3);
    this.circle(ctx, 3, cy, 3.5, '#4a3d31');
    this.circle(ctx, 4, cy - 1, 1.5, '#ff2222');
    this.line(ctx, 6, cy + 1, 13, cy + 3, '#c0392b', 1.5);
  },

  // Monstruo de metal (Heavy Metal y sus mini versiones)
  metal(ctx, w, h, t, walking, magnet, mouthOpen) {
    const st = walking ? Math.sin(t * 0.25) * 3 : 0;
    this.box(ctx, -w * 0.32, -h * 0.24 - st, w * 0.22, h * 0.24 + st, 4, '#5f6b77');
    this.box(ctx, w * 0.1, -h * 0.24 + st, w * 0.22, h * 0.24 - st, 4, '#5f6b77');
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, '#eef3f7'); g.addColorStop(0.5, '#a7b1bb'); g.addColorStop(1, '#6f7a85');
    ctx.fillStyle = g; this.rr(ctx, -w / 2, -h, w, h * 0.8, w * 0.28); ctx.fill();
    // chatarra pegada
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(-w * 0.35 + this.hash(i * 2.1) * w * 0.7, -h * 0.5 + this.hash(i * 4.7) * h * 0.25);
      ctx.rotate(this.hash(i) * 3);
      ctx.fillStyle = i % 2 ? '#7d6b5d' : '#8d99a5'; ctx.fillRect(-w * 0.06, -w * 0.03, w * 0.12, w * 0.06);
      ctx.restore();
    }
    for (let i = 0; i < 5; i++) this.circle(ctx, -w * 0.36 + i * w * 0.18, -h * 0.24, w * 0.03, '#5f6b77');
    // visor y ojos
    this.box(ctx, -w * 0.3, -h * 0.86, w * 0.6, h * 0.18, w * 0.06, '#1d1d24');
    const glow = 0.6 + 0.4 * Math.sin(t * 0.15);
    this.circle(ctx, -w * 0.12, -h * 0.77, w * 0.07, `rgba(255,50,50,${glow})`);
    this.circle(ctx, w * 0.14, -h * 0.77, w * 0.07, `rgba(255,50,50,${glow})`);
    this.line(ctx, -w * 0.24, -h * 0.9, -w * 0.04, -h * 0.85, '#1d1d24', w * 0.04);
    this.line(ctx, w * 0.26, -h * 0.9, w * 0.06, -h * 0.85, '#1d1d24', w * 0.04);
    // boca
    this.box(ctx, -w * 0.2, -h * 0.58, w * 0.4, h * (mouthOpen ? 0.14 : 0.08), 3, '#333');
    ctx.fillStyle = '#ddd';
    for (let i = 0; i < 4; i++) ctx.fillRect(-w * 0.17 + i * w * 0.1, -h * 0.58, w * 0.05, h * 0.04);
    // brazos imán
    ctx.save(); ctx.translate(w * 0.5, -h * 0.55);
    ctx.lineWidth = w * 0.11; ctx.strokeStyle = '#d62828'; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(w * 0.06, 0, w * 0.12, Math.PI * 0.5, Math.PI * 1.5, false); ctx.stroke();
    ctx.fillStyle = '#eef3f7';
    ctx.fillRect(w * 0.06, -w * 0.12 - w * 0.055, w * 0.09, w * 0.11);
    ctx.fillRect(w * 0.06, w * 0.12 - w * 0.055, w * 0.09, w * 0.11);
    ctx.restore();
    if (magnet) {
      ctx.strokeStyle = 'rgba(120,200,255,0.7)'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const r = ((t * 2 + i * 25) % 75) + 20;
        ctx.beginPath(); ctx.arc(w * 0.6, -h * 0.55, r, -0.6, 0.6); ctx.stroke();
      }
    }
  },

  // Dragón genérico (origen en el centro del cuerpo, mirando a la derecha)
  dragon(ctx, s, c, t, mood) {
    const fl = Math.sin(t * 0.25);
    this.poly(ctx, [-2 * s, -6 * s, -10 * s, (-26 - fl * 8) * s, 10 * s, -8 * s], c.wingDark);
    ctx.strokeStyle = c.body; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-12 * s, 2 * s); ctx.quadraticCurveTo(-24 * s, 10 * s, -30 * s, 0); ctx.stroke();
    this.poly(ctx, [-30 * s, 0, -38 * s, -5 * s, -35 * s, 5 * s], c.spike);
    this.ellipse(ctx, 0, 0, 15 * s, 10 * s, c.body);
    this.ellipse(ctx, 2 * s, 4 * s, 10 * s, 5 * s, c.belly);
    for (let i = 0; i < 3; i++) this.poly(ctx, [(-8 + i * 6) * s, -9 * s, (-5 + i * 6) * s, -14 * s, (-2 + i * 6) * s, -9 * s], c.spike);
    this.box(ctx, -7 * s, 6 * s, 5 * s, 7 * s, 2, c.body);
    this.box(ctx, 4 * s, 6 * s, 5 * s, 7 * s, 2, c.body);
    this.poly(ctx, [0, -6 * s, -6 * s, (-30 - fl * 10) * s, 14 * s, -8 * s], c.wing);
    this.circle(ctx, 14 * s, -10 * s, 8 * s, c.body);
    this.ellipse(ctx, 21 * s, -7 * s, 7 * s, 5 * s, c.body);
    this.poly(ctx, [9 * s, -16 * s, 7 * s, -24 * s, 13 * s, -17 * s], c.horn);
    if (mood === 'none') return;
    if (mood === 'happy') {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.arc(16 * s, -11 * s, 2.4 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      this.circle(ctx, 19 * s, -6 * s, 2.2 * s, 'rgba(255,120,150,0.7)');
      ctx.beginPath(); ctx.arc(22 * s, -5 * s, 3 * s, 0.2, Math.PI * 0.8); ctx.stroke();
    } else {
      this.circle(ctx, 16 * s, -11 * s, 2.8 * s, '#fff');
      this.circle(ctx, 17 * s, -11 * s, 1.5 * s, '#222');
      this.line(ctx, 12 * s, -15 * s, 19 * s, -13 * s, '#222', 1.5 * s);
    }
    this.circle(ctx, 26 * s, -9 * s, 1.2 * s, '#222');
  },

  // Caballero (pequeños y El Caballero Oscuro)
  knight(ctx, w, h, t, c, pose) {
    const sw = pose.walking ? Math.sin(t * 0.3) * 3 : 0;
    if (c.cape) this.poly(ctx, [-w * 0.3, -h * 0.82, -w * 0.62 - sw, -h * 0.04, w * 0.1, -h * 0.04, w * 0.12, -h * 0.82], c.cape);
    this.box(ctx, -w * 0.3 + sw * 0.5, -h * 0.34, w * 0.24, h * 0.34, 3, c.dark);
    this.box(ctx, w * 0.06 - sw * 0.5, -h * 0.34, w * 0.24, h * 0.34, 3, c.armor);
    this.box(ctx, -w * 0.38, -h * 0.74, w * 0.76, h * 0.44, 6, c.armor);
    this.box(ctx, -w * 0.26, -h * 0.7, w * 0.52, h * 0.38, 4, c.tabard);
    ctx.fillStyle = c.cross;
    ctx.fillRect(-w * 0.05, -h * 0.66, w * 0.1, h * 0.3);
    ctx.fillRect(-w * 0.18, -h * 0.58, w * 0.36, h * 0.07);
    // casco
    this.box(ctx, -w * 0.28, -h, w * 0.56, h * 0.29, w * 0.14, c.armor);
    ctx.fillStyle = '#111'; ctx.fillRect(-w * 0.02, -h * 0.9, w * 0.28, h * 0.045);
    if (c.eyes) { this.circle(ctx, w * 0.08, -h * 0.877, 2.2, c.eyes); this.circle(ctx, w * 0.2, -h * 0.877, 2.2, c.eyes); }
    if (c.crown) {
      const y0 = -h * 0.98, y1 = -h * 1.13;
      this.poly(ctx, [-w * 0.26, y0, -w * 0.26, y1, -w * 0.13, y0 - h * 0.06, 0, y1 - h * 0.02, w * 0.13, y0 - h * 0.06, w * 0.26, y1, w * 0.26, y0], c.crown);
      this.circle(ctx, 0, y0 - h * 0.04, 2.5, '#e63946');
      this.circle(ctx, -w * 0.16, y0 - h * 0.025, 1.8, '#3fa9f5');
      this.circle(ctx, w * 0.16, y0 - h * 0.025, 1.8, '#3fa9f5');
    } else if (c.plume) {
      this.ellipse(ctx, -w * 0.05, -h * 1.02, w * 0.22, h * 0.06, c.plume, -0.3);
    }
    // espada
    let ang = -0.5;
    if (pose.raise) ang = -0.5 - pose.raise * 1.8;
    if (pose.slash != null) ang = -2.3 + pose.slash * 2.9;
    ctx.save(); ctx.translate(w * 0.2, -h * 0.6); ctx.rotate(ang);
    this.box(ctx, -3, -3.5, w * 0.32, 7, 3, c.armor);
    ctx.translate(w * 0.32, 0);
    ctx.fillStyle = '#5e3b1a'; ctx.fillRect(-6, -2, 6, 4);
    ctx.fillStyle = '#d4a017'; ctx.fillRect(-1, -7, 4, 14);
    this.poly(ctx, [3, -3, 3 + c.sword, -3, 3 + c.sword + 7, 0, 3 + c.sword, 3, 3, 3], '#dfe6ee');
    ctx.restore();
    if (c.shield) {
      this.box(ctx, w * 0.12, -h * 0.66, w * 0.34, h * 0.36, 6, c.shield);
      this.box(ctx, w * 0.2, -h * 0.6, w * 0.18, h * 0.06, 2, '#f5f5f5');
    }
  },

  // ============================================================
  //  JEFES
  // ============================================================
  boss(ctx, b) {
    ctx.save();
    if (b.invuln > 0 && b.invuln % 4 < 2) ctx.globalAlpha = 0.55;
    if (b.dying) ctx.globalAlpha = 0.5 + 0.5 * Math.sin(b.dying * 0.6);
    if (b.kind === 'dobleDragon') this.doubleDragon(ctx, b);
    else if (b.kind === 'witchSand' || b.kind === 'iceKill' || b.kind === 'llamarada') this.bossX(ctx, b);
    else {
      ctx.translate(Math.round(b.x + b.w / 2), Math.round(b.y + b.h));
      if (b.state === 'chargeWarn' || b.state === 'slashWarn' || b.state === 'waveWarn') ctx.translate((Math.random() - 0.5) * 3, 0);
      ctx.scale(b.facing, 1);
      if (b.kind === 'heavyMetal') this.metal(ctx, b.w, b.h, b.t, Math.abs(b.vx) > 0.1, b.state === 'magnet', b.state === 'throw');
      else {
        const pose = { walking: Math.abs(b.vx) > 0.1 };
        if (b.state === 'slashWarn' || b.state === 'waveWarn') pose.raise = 1;
        if (b.state === 'slash') pose.slash = 1 - b.timer / 14;
        this.knight(ctx, b.w, b.h, b.t, { armor: '#2d2d3a', dark: '#1d1d26', tabard: '#3d1020', cross: '#f5f5f5', crown: '#f5c518', cape: '#8e1b2b', eyes: '#ff3b3b', sword: 54 }, pose);
        if (b.state === 'slash') {
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.arc(b.w * 0.2, -b.h * 0.6, 80, -1.6, 0.8); ctx.stroke();
        }
        if (b.state === 'dizzy') {
          for (let i = 0; i < 3; i++) {
            const a = b.t * 0.12 + i * 2.1;
            this.shuriken(ctx, Math.cos(a) * 22, -b.h - 14 + Math.sin(a) * 6, 6, a, '#ffe14d');
          }
        }
      }
    }
    ctx.restore();
  },

  doubleDragon(ctx, b) {
    const w = b.w, h = b.h, t = b.t, fl = Math.sin(t * 0.12);
    ctx.translate(Math.round(b.x), Math.round(b.y));
    // alas
    this.poly(ctx, [w * 0.38, h * 0.45, w * 0.1, h * (0.0 - fl * 0.25), -w * 0.12, h * 0.25, w * 0.08, h * 0.35, -w * 0.02, h * 0.55, w * 0.32, h * 0.62], '#3d2160');
    this.poly(ctx, [w * 0.62, h * 0.45, w * 0.9, h * (0.0 - fl * 0.25), w * 1.12, h * 0.25, w * 0.92, h * 0.35, w * 1.02, h * 0.55, w * 0.68, h * 0.62], '#3d2160');
    // cola
    ctx.strokeStyle = '#6a3d9a'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.85); ctx.quadraticCurveTo(w * 0.5, h * 1.05, w * 0.78, h * 0.98); ctx.stroke();
    this.poly(ctx, [w * 0.78, h * 0.9, w * 0.9, h * 0.98, w * 0.78, h * 1.06], '#f5c518');
    // patas y cuerpo
    this.box(ctx, w * 0.3, h * 0.8, w * 0.11, h * 0.2, 5, '#55307d');
    this.box(ctx, w * 0.59, h * 0.8, w * 0.11, h * 0.2, 5, '#55307d');
    this.ellipse(ctx, w / 2, h * 0.64, w * 0.28, h * 0.3, '#6a3d9a');
    this.ellipse(ctx, w / 2, h * 0.72, w * 0.17, h * 0.18, '#c9a6e8');
    // cuellos
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#b83a2e';
    ctx.beginPath(); ctx.moveTo(w * 0.4, h * 0.48); ctx.quadraticCurveTo(w * 0.28, h * 0.2, w * 0.16, h * 0.22); ctx.stroke();
    ctx.strokeStyle = '#3a85c4';
    ctx.beginPath(); ctx.moveTo(w * 0.6, h * 0.48); ctx.quadraticCurveTo(w * 0.72, h * 0.2, w * 0.84, h * 0.22); ctx.stroke();
    // cabezas
    this.dragonHead(ctx, w * 0.14, h * 0.2, -1, '#e74c3c', '#ffd166', b.mouth > 0 && b.mouthEl === 'fire', 'fire', t);
    this.dragonHead(ctx, w * 0.86, h * 0.2, 1, '#4aa3df', '#e6f8ff', b.mouth > 0 && b.mouthEl === 'ice', 'ice', t);
  },
  dragonHead(ctx, x, y, dir, color, horn, open, el, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    this.poly(ctx, [-4, -12, -10, -26, 2, -14], horn);
    this.poly(ctx, [4, -12, 2, -27, 10, -12], horn);
    this.circle(ctx, 0, 0, 15, color);
    this.ellipse(ctx, 14, open ? -2 : 3, 13, 7, color);
    if (open) {
      this.ellipse(ctx, 14, 9, 12, 5, color);
      this.ellipse(ctx, 16, 4, 9, 3, '#3a0d0d');
    }
    this.circle(ctx, 3, -5, 4.5, '#fff');
    this.circle(ctx, 4.5, -5, 2.5, el === 'fire' ? '#c0392b' : '#1b4f72');
    this.line(ctx, -3, -11, 9, -8, '#222', 2.5);
    this.circle(ctx, 24, -1, 1.6, '#222');
    if (el === 'fire' && t % 20 < 10) this.circle(ctx, 26, 6, 3, '#ffb02e');
    if (el === 'ice') this.poly(ctx, [10, 9, 12, 16, 14, 9], '#e6f8ff');
    ctx.restore();
  },

  // ============================================================
  //  PROYECTILES
  // ============================================================
  projectile(ctx, p) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    switch (p.kind) {
      case 'star': this.shuriken(ctx, cx, cy, 9, p.t * 0.5); break;
      case 'arrow': {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(p.vy, p.vx));
        this.line(ctx, -13, 0, 10, 0, '#c8a165', 2.5);
        this.poly(ctx, [10, -4, 16, 0, 10, 4], '#ccd3db');
        this.poly(ctx, [-13, 0, -17, -4, -9, 0], '#e63946'); this.poly(ctx, [-13, 0, -17, 4, -9, 0], '#e63946');
        ctx.restore(); break;
      }
      case 'fire':
        this.circle(ctx, cx - p.vx * 2, cy - p.vy * 2, 7, 'rgba(255,120,30,0.4)');
        this.circle(ctx, cx, cy, 9, '#ff7b1c'); this.circle(ctx, cx, cy, 5, '#ffe14d'); break;
      case 'friendFire':
        this.circle(ctx, cx - p.vx * 2, cy - p.vy * 2, 6, 'rgba(120,255,120,0.4)');
        this.circle(ctx, cx, cy, 8, '#7be36a'); this.circle(ctx, cx, cy, 4, '#f6ffb0'); break;
      case 'ice':
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.t * 0.1);
        this.poly(ctx, [0, -10, 6, 0, 0, 10, -6, 0], '#bdefff');
        this.poly(ctx, [0, -10, 6, 0, 0, 0], '#ffffff');
        ctx.restore(); break;
      case 'scrap': case 'scrapIn':
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.t * 0.2);
        ctx.fillStyle = '#8d99a5';
        ctx.beginPath(); for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i * Math.PI / 3) * 9, Math.sin(i * Math.PI / 3) * 9); ctx.closePath(); ctx.fill();
        this.circle(ctx, 0, 0, 3.5, '#4a525b');
        ctx.restore();
        if (p.kind === 'scrapIn') this.circle(ctx, cx, cy, 13, 'rgba(120,200,255,0.25)');
        break;
      case 'wave':
        this.ellipse(ctx, cx, p.y + p.h, p.w / 2, p.h, 'rgba(255,230,150,0.8)');
        this.ellipse(ctx, cx, p.y + p.h, p.w / 3, p.h * 0.6, 'rgba(255,255,255,0.9)');
        break;
      case 'swordwave':
        ctx.save(); ctx.translate(cx, cy); ctx.scale(Math.sign(p.vx) || 1, 1);
        ctx.fillStyle = 'rgba(190,60,255,0.75)';
        ctx.beginPath(); ctx.arc(-6, 0, 20, -1.3, 1.3); ctx.arc(-14, 0, 16, 1.2, -1.2, true); ctx.closePath(); ctx.fill();
        ctx.restore(); break;
      case 'diamond': this.diamond(ctx, cx, cy, 11, p.t); break;
      default: this.projectileX(ctx, p, cx, cy);
    }
  },

  diamond(ctx, cx, cy, r, t) {
    this.circle(ctx, cx, cy, r * 1.6, `rgba(120,240,255,${0.2 + 0.1 * Math.sin(t * 0.2)})`);
    this.poly(ctx, [cx - r, cy - r * 0.3, cx - r * 0.5, cy - r * 0.8, cx + r * 0.5, cy - r * 0.8, cx + r, cy - r * 0.3, cx, cy + r], '#5ce1e6');
    this.poly(ctx, [cx - r, cy - r * 0.3, cx + r, cy - r * 0.3, cx, cy + r], '#2bb8c4');
    this.poly(ctx, [cx - r * 0.5, cy - r * 0.8, cx, cy - r * 0.3, cx - r * 0.2, cy - r * 0.8], '#ffffff');
    if (t % 40 < 8) { this.line(ctx, cx + r * 0.6, cy - r * 1.2, cx + r * 0.6, cy - r * 0.6, '#fff', 2); this.line(ctx, cx + r * 0.3, cy - r * 0.9, cx + r * 0.9, cy - r * 0.9, '#fff', 2); }
  },

  // ============================================================
  //  OBJETOS Y DECORADOS
  // ============================================================
  item(ctx, it) {
    if (it.life && it.life < 120 && it.life % 8 < 4) return;
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2 + it.bob();
    if (it.kind === 'coin') {
      const sx = Math.abs(Math.cos(it.t * 0.07));
      this.ellipse(ctx, cx, cy, 10 * sx + 1, 11, '#e0a800');
      this.ellipse(ctx, cx, cy, 7 * sx + 0.5, 8, '#ffd43b');
      if (sx > 0.4) { ctx.fillStyle = '#fff6b0'; ctx.fillRect(cx - 1.5 * sx, cy - 5, 3 * sx, 10); }
      return;
    }
    if (it.kind === 'life') { this.lifeItem(ctx, cx, cy, it.t); return; }
    if (it.kind === 'pocion') { this.circle(ctx, cx, cy, 20 + Math.sin(it.t * 0.1) * 2, 'rgba(61,220,132,0.22)'); this.potion(ctx, cx, cy, 15); return; }
    if (it.kind === 'escudoJefe') { this.circle(ctx, cx, cy, 21 + Math.sin(it.t * 0.1) * 2, 'rgba(201,182,255,0.25)'); this.bossShield(ctx, cx, cy, 15); return; }
    if (it.kind === 'pocionVida') { this.circle(ctx, cx, cy, 22 + Math.sin(it.t * 0.1) * 3, 'rgba(255,107,139,0.3)'); this.lifePotion(ctx, cx, cy, 16); return; }
    if (it.kind === 'escudo') { this.circle(ctx, cx, cy, 20, 'rgba(255,220,120,0.2)'); this.shieldItem(ctx, cx, cy, 14); return; }
    if (it.kind === 'heart') { this.heart(ctx, cx, cy, 11, '#ff4d6d'); this.circle(ctx, cx - 4, cy - 3, 2, '#ffc2cd'); return; }
    if (it.kind === 'diamond') { this.diamond(ctx, cx, cy, 13, it.t); return; }
    // armas y armaduras: burbuja brillante
    this.circle(ctx, cx, cy, 20 + Math.sin(it.t * 0.1) * 2, 'rgba(255,255,255,0.18)');
    ctx.strokeStyle = `rgba(255,255,180,${0.6 + 0.3 * Math.sin(it.t * 0.1)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 19, 0, Math.PI * 2); ctx.stroke();
    const [type, id] = it.kind.split(':');
    if (type === 'weapon') this.weaponIcon(ctx, id, cx, cy, 15);
    else this.armorIcon(ctx, cx, cy, 13, ARMORS[id]);
    for (let i = 0; i < 2; i++) {
      const a = it.t * 0.05 + i * Math.PI;
      this.circle(ctx, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, 2, '#fff8c0');
    }
  },

  weaponIcon(ctx, id, cx, cy, s) {
    ctx.save(); ctx.translate(cx, cy);
    switch (id) {
      case 'espadaFuego': case 'espadaHielo':
        ctx.rotate(-0.8); ctx.scale(s / 24, s / 24); ctx.translate(-20, 0);
        this.elementSword(ctx, id === 'espadaFuego' ? 'fire' : 'ice', 0);
        break;
      case 'espadaLaser':
        ctx.rotate(-0.8); ctx.scale(s / 24, s / 24); ctx.translate(-20, 0);
        this.laserSword(ctx, 0);
        break;
      case 'baston': ctx.rotate(-0.8); this.box(ctx, -s, -2, s * 2, 4, 2, '#a0703f'); ctx.fillStyle = '#5e3b1a'; ctx.fillRect(-s, -2, 4, 4); ctx.fillRect(s - 4, -2, 4, 4); break;
      case 'espada': ctx.rotate(-0.8); ctx.fillStyle = '#5e3b1a'; ctx.fillRect(-s, -2, 6, 4); ctx.fillStyle = '#d4a017'; ctx.fillRect(-s + 6, -5, 3, 10); this.poly(ctx, [-s + 9, -2.5, s - 3, -2.5, s + 2, 0, s - 3, 2.5, -s + 9, 2.5], '#e2e8ef'); break;
      case 'lunchacos': ctx.save(); ctx.rotate(-0.5); this.box(ctx, -s, -2.5, s * 0.9, 5, 2, '#b5651d'); ctx.restore(); ctx.save(); ctx.rotate(0.6); this.box(ctx, s * 0.1, -2.5, s * 0.9, 5, 2, '#b5651d'); ctx.restore(); this.circle(ctx, 0, 0, 2, '#ccc'); break;
      case 'estrellas': this.shuriken(ctx, 0, 0, s * 0.8, 0.3); break;
      case 'arco':
        ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-s * 0.4, 0, s, -1.1, 1.1); ctx.stroke();
        this.line(ctx, -s * 0.4 + s * Math.cos(1.1), -s * Math.sin(1.1), -s * 0.4 + s * Math.cos(1.1), s * Math.sin(1.1), '#eee', 1);
        this.line(ctx, -s * 0.6, 0, s, 0, '#c8a165', 2); this.poly(ctx, [s, -3, s + 5, 0, s, 3], '#ccc'); break;
    }
    ctx.restore();
  },

  armorIcon(ctx, cx, cy, s, a) {
    this.box(ctx, cx - s * 0.8, cy - s * 0.1, s * 1.6, s * 1.1, s * 0.3, a.color);
    ctx.fillStyle = a.dark; ctx.fillRect(cx - s * 0.8, cy + s * 0.35, s * 1.6, s * 0.15);
    ctx.fillStyle = a.color; ctx.beginPath(); ctx.arc(cx, cy - s * 0.25, s * 0.65, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = a.dark; ctx.fillRect(cx - s * 0.7, cy - s * 0.3, s * 1.4, s * 0.14);
    this.poly(ctx, [cx - s * 0.15, cy - s * 0.85, cx, cy - s * 1.2, cx + s * 0.15, cy - s * 0.85], a.shine);
    ctx.fillStyle = a.shine; ctx.fillRect(cx - s * 0.5, cy + s * 0.05, s * 0.18, s * 0.3);
  },

  heart(ctx, x, y, s, c) {
    ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.6, y - s * 0.1, x - s * 0.8, y - s * 1.3, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.8, y - s * 1.3, x + s * 1.6, y - s * 0.1, x, y + s * 0.9);
    ctx.fill();
  },
  shieldIcon(ctx, x, y, s, c) {
    ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y - s); ctx.lineTo(x + s, y);
    ctx.quadraticCurveTo(x + s, y + s * 0.8, x, y + s * 1.2);
    ctx.quadraticCurveTo(x - s, y + s * 0.8, x - s, y); ctx.closePath(); ctx.fill();
  },
  ninjaHead(ctx, x, y, s) {
    this.circle(ctx, x, y, s, PAL.suit);
    this.box(ctx, x - s * 0.1, y - s * 0.4, s, s * 0.7, 2, PAL.skin);
    ctx.fillStyle = PAL.band; ctx.fillRect(x - s, y - s * 0.85, s * 2, s * 0.4);
  },

  checkpoint(ctx, c, f) {
    ctx.fillStyle = '#ddd'; ctx.fillRect(c.x + 2, c.y, 4, c.h);
    this.circle(ctx, c.x + 4, c.y, 4, '#ffd43b');
    const wv = Math.sin(f * 0.15) * 3;
    this.poly(ctx, [c.x + 6, c.y + 4, c.x + 30, c.y + 12 + wv, c.x + 6, c.y + 22], c.active ? '#3fbf63' : '#e63946');
    if (c.active) this.shuriken(ctx, c.x + 15, c.y + 13 + wv / 2, 4, f * 0.05, '#fff');
    this.box(ctx, c.x - 2, c.y + c.h - 6, 12, 6, 2, '#777');
  },

  platform(ctx, pl, theme, f) {
    if (pl.style === 'dragon') {
      ctx.save();
      ctx.translate(pl.x + pl.w / 2, pl.y + 22);
      ctx.scale(pl.dx < 0 ? -1 : 1, 1);
      this.dragon(ctx, 2.1, { body: '#5cc44a', belly: '#e8ffb8', wing: '#3e9a33', wingDark: '#2c7524', horn: '#fff8e0', spike: '#ffd43b' }, f, 'happy');
      ctx.restore();
      return;
    }
    if (pl.style === 'blink') { this.blinkPlat(ctx, pl, f); return; }
    let sx = 0;
    if (pl.style === 'falling' && pl.state === 'shake') sx = (Math.random() - 0.5) * 3;
    const ts = TILESET[theme];
    const x = pl.x + sx, y = pl.y;
    if (pl.style === 'falling') {
      this.box(ctx, x, y, pl.w, pl.h, 4, ({ forest: ts.plat, beach: '#c9a46a', ice: '#a9dcf0', volcano: '#4a3a3a', hell: '#5a1f2a' })[theme] || '#8a7f72');
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + pl.w * 0.3, y); ctx.lineTo(x + pl.w * 0.4, y + 8); ctx.lineTo(x + pl.w * 0.32, y + pl.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + pl.w * 0.7, y); ctx.lineTo(x + pl.w * 0.62, y + 9); ctx.stroke();
      return;
    }
    if (EXTRA_THEMES.has(theme)) return this.platX(ctx, x, y, pl, theme, f);
    if (theme === 'city') {
      this.box(ctx, x, y, pl.w, pl.h, 3, '#3fa9f5');
      ctx.fillStyle = '#1f6fb0'; ctx.fillRect(x, y + pl.h - 4, pl.w, 4);
      for (let i = 0; i < pl.w; i += 16) this.circle(ctx, x + i + 8, y + 6, 2, '#bfe3ff');
    } else if (theme === 'forest') {
      this.box(ctx, x, y, pl.w, pl.h, 8, '#8b5a2b');
      ctx.fillStyle = '#5e3b1a'; ctx.fillRect(x + 8, y + 5, pl.w - 16, 2);
      this.ellipse(ctx, x + 4, y + pl.h / 2, 4, pl.h / 2, '#c49a6c');
    } else {
      this.box(ctx, x, y, pl.w, pl.h, 3, '#8b5a2b');
      ctx.fillStyle = '#5e3b1a'; for (let i = 16; i < pl.w; i += 16) ctx.fillRect(x + i, y, 2, pl.h);
      this.line(ctx, x + 6, y, x + 6, y - 200, '#666', 2); this.line(ctx, x + pl.w - 6, y, x + pl.w - 6, y - 200, '#666', 2);
    }
  },

  jet(ctx, j, f) {
    this.box(ctx, j.x - 2, j.baseY - 8, j.w + 4, 8, 2, j.style === 'steam' ? '#6b7079' : '#5a4636');
    if (j.state === 'warn') {
      for (let i = 0; i < 3; i++) this.circle(ctx, j.x + j.w / 2 + (Math.random() - 0.5) * 14, j.baseY - 10 - Math.random() * 10, 2 + Math.random() * 2, j.style === 'steam' ? 'rgba(255,255,255,0.6)' : '#ffb02e');
    }
    if (j.state === 'on' && j.flameH > 0) {
      const top = j.baseY - j.flameH;
      if (j.style === 'steam') {
        for (let y = j.baseY - 8; y > top; y -= 14) this.circle(ctx, j.x + j.w / 2 + Math.sin(y * 0.2 + f * 0.3) * 4, y, 11, 'rgba(240,248,255,0.85)');
      } else {
        const g = ctx.createLinearGradient(0, top, 0, j.baseY);
        g.addColorStop(0, 'rgba(255,230,80,0.2)'); g.addColorStop(0.3, '#ffb02e'); g.addColorStop(1, '#ff4d1c');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(j.x, j.baseY - 6);
        ctx.quadraticCurveTo(j.x - 4 + Math.sin(f * 0.5) * 3, top + j.flameH * 0.5, j.x + j.w / 2, top);
        ctx.quadraticCurveTo(j.x + j.w + 4 + Math.cos(f * 0.5) * 3, top + j.flameH * 0.5, j.x + j.w, j.baseY - 6);
        ctx.closePath(); ctx.fill();
      }
    }
  },

  crusher(ctx, c) {
    let sx = c.state === 'warn' ? (Math.random() - 0.5) * 4 : 0;
    this.line(ctx, c.x + c.w / 2, 0, c.x + c.w / 2, c.y, '#555', 4);
    const x = c.x + sx, y = c.y;
    this.box(ctx, x, y, c.w, c.h, 6, '#7a7590');
    this.box(ctx, x + 4, y + 4, c.w - 8, c.h - 14, 4, '#8f8aa6');
    for (let i = 0; i < 4; i++) this.poly(ctx, [x + 4 + i * 15, y + c.h, x + 11 + i * 15, y + c.h + 8, x + 18 + i * 15, y + c.h], '#d4dae0');
    this.box(ctx, x + 14, y + 16, 10, 10, 2, '#fff'); this.box(ctx, x + 40, y + 16, 10, 10, 2, '#fff');
    this.box(ctx, x + 18, y + 19, 5, 6, 1, '#222'); this.box(ctx, x + 41, y + 19, 5, 6, 1, '#222');
    this.line(ctx, x + 12, y + 12, x + 26, y + 16, '#222', 3); this.line(ctx, x + 52, y + 12, x + 38, y + 16, '#222', 3);
    this.box(ctx, x + 20, y + 34, 24, 6, 2, '#222');
  },

  friend(ctx, d, f) {
    ctx.save();
    ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
    ctx.scale(d.facing, 1);
    this.dragon(ctx, 1, { body: '#5cc44a', belly: '#e8ffb8', wing: '#3e9a33', wingDark: '#2c7524', horn: '#fff8e0', spike: '#ffd43b' }, f, 'happy');
    ctx.restore();
    if (d.state === 'idle') {
      this.heart(ctx, d.x + d.w / 2, d.y - 14 + Math.sin(f * 0.1) * 3, 7, '#ff6b8b');
    }
  },

  portal(ctx, p) {
    const s = Math.min(1, p.t / 40);
    const cx = p.cx, cy = p.groundY - p.h / 2 * s;
    this.ellipse(ctx, cx, cy, 40 * s, p.h / 2 * s + 6, 'rgba(160,90,255,0.3)');
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = i % 2 ? 'rgba(120,240,255,0.9)' : 'rgba(200,120,255,0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, (30 - i * 6) * s, (p.h / 2 - i * 8) * s, 0, p.t * 0.08 + i, p.t * 0.08 + i + Math.PI * 1.4);
      ctx.stroke();
    }
    this.ellipse(ctx, cx, cy, 10 * s, 30 * s, 'rgba(255,255,255,0.8)');
    for (let i = 0; i < 6; i++) {
      const a = p.t * 0.05 + i;
      this.circle(ctx, cx + Math.cos(a) * 34 * s, cy + Math.sin(a) * 50 * s, 2.5, '#e8d0ff');
    }
  },

  particle(ctx, p) {
    const a = Math.max(0, p.life / p.max);
    if (p.text) {
      ctx.globalAlpha = Math.min(1, a * 2);
      this.text(ctx, p.text, p.x, p.y, p.size, p.color);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = a;
    this.circle(ctx, p.x, p.y, p.size * (0.5 + a * 0.5), p.color);
    ctx.globalAlpha = 1;
  },
};
