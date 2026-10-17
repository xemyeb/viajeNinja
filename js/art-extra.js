'use strict';
// ============================================================
//  Gráficos de los mundos 4-6, objetos nuevos y escena final
//  (amplía el objeto Art definido en art.js)
// ============================================================
const EXTRA_THEMES = new Set(['beach', 'ice', 'volcano']);

Object.assign(TILESET, {
  beach: {
    ground: '#e9c98a', groundTop: '#f6e0a8', groundDark: '#d2ad6a',
    block: '#d1a660', blockDark: '#a87d3e',
    plat: '#a5703a', platDark: '#6e4620', spike: '#5b2a6e', liquid: '#2fa6d9',
  },
  ice: {
    ground: '#8fc9e8', groundTop: '#ffffff', groundDark: '#5fa6cf',
    block: '#bfe8fa', blockDark: '#7cc3e6',
    plat: '#d9f3ff', platDark: '#8fc9e8', spike: '#d9f3ff', liquid: '#2a6fb0',
  },
  volcano: {
    ground: '#3b302f', groundTop: '#55443f', groundDark: '#2a2120', crack: '#ff6a1a',
    block: '#2a2230', blockDark: '#1a141f',
    plat: '#4a3a3a', platDark: '#2a2120', spike: '#1a141f', liquid: '#ff6a1a',
  },
});

Object.assign(Art, {
  // ============================================================
  //  FONDOS
  // ============================================================
  bgBeach(ctx, camX, f) {
    ctx.fillStyle = this.grad(ctx, 'beach', ['#4fb3f0', 0, '#a6defa', 0.55, '#fff2cf', 1]);
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.circle(ctx, 780 - camX * 0.02, 110, 70, 'rgba(255,240,170,0.5)');
    this.circle(ctx, 780 - camX * 0.02, 110, 52, '#fff3a0');
    // nubes
    for (let i = 0; i < 4; i++) {
      const x = ((i * 300 - camX * 0.05 + f * 0.2) % (VIEW_W + 300) + VIEW_W + 300) % (VIEW_W + 300) - 150;
      this.ellipse(ctx, x, 70 + this.hash(i * 5) * 60, 55, 16, 'rgba(255,255,255,0.9)');
    }
    // gaviotas
    for (let i = 0; i < 3; i++) {
      const x = ((f * 0.8 + i * 330) % (VIEW_W + 100)) - 50, y = 150 + i * 30 + Math.sin(f * 0.05 + i) * 8;
      const w = Math.sin(f * 0.2 + i) * 4;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 9, y - w); ctx.quadraticCurveTo(x - 4, y - 5, x, y); ctx.quadraticCurveTo(x + 4, y - 5, x + 9, y - w); ctx.stroke();
    }
    // mar en el horizonte
    const hy = 300;
    ctx.fillStyle = '#2f93c9'; ctx.fillRect(0, hy, VIEW_W, VIEW_H - hy);
    ctx.fillStyle = '#5bb8e6'; ctx.fillRect(0, hy, VIEW_W, 6);
    for (let r = 0; r < 6; r++) {
      const y = hy + 20 + r * 34;
      for (let i = -1; i < 12; i++) {
        const x = i * 100 + ((f * (0.3 + r * 0.1) - camX * (0.1 + r * 0.05)) % 100 + 100) % 100;
        this.ellipse(ctx, x, y, 22, 2.5, 'rgba(255,255,255,0.45)');
      }
    }
    // isla lejana
    const ix = 200 - camX * 0.04;
    this.ellipse(ctx, ix, hy + 4, 110, 22, '#5aa06a');
    this.palm(ctx, ix + 20, hy - 4, 0.6, '#3f7f4a', '#6b4a2b', f);
    // palmeras cercanas
    const off = camX * 0.45, sp = 260;
    for (let i = Math.floor(off / sp) - 1; i < Math.floor(off / sp) + 6; i++) {
      this.palm(ctx, i * sp - off + this.hash(i) * 60, VIEW_H - 40, 1.1 + this.hash(i * 3) * 0.3, '#2f8f46', '#8a5a2b', f + i * 13);
    }
  },
  palm(ctx, x, baseY, s, leaf, trunk, f) {
    ctx.strokeStyle = trunk; ctx.lineWidth = 10 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.quadraticCurveTo(x + 20 * s, baseY - 80 * s, x + 10 * s, baseY - 150 * s); ctx.stroke();
    const tx = x + 10 * s, ty = baseY - 150 * s;
    const sw = Math.sin(f * 0.03) * 0.08;
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI + k * (Math.PI / 5) + sw;
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(a);
      this.ellipse(ctx, 34 * s, 8 * s, 36 * s, 9 * s, leaf, 0.35);
      ctx.restore();
    }
    this.circle(ctx, tx - 6 * s, ty + 6 * s, 6 * s, '#6b4a2b');
    this.circle(ctx, tx + 6 * s, ty + 7 * s, 6 * s, '#6b4a2b');
  },

  bgIce(ctx, camX, f) {
    ctx.fillStyle = this.grad(ctx, 'ice', ['#1d2b5c', 0, '#4b5fa8', 0.5, '#b9d8f2', 1]);
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // aurora boreal
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = ['rgba(90,255,180,0.18)', 'rgba(90,220,255,0.15)', 'rgba(180,120,255,0.12)'][k];
      ctx.beginPath();
      for (let x = 0; x <= VIEW_W; x += 20) {
        const y = 70 + k * 30 + Math.sin(x * 0.01 + f * 0.01 + k) * 25 + Math.sin(x * 0.023 - f * 0.015) * 12;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      for (let x = VIEW_W; x >= 0; x -= 20) {
        const y = 120 + k * 30 + Math.sin(x * 0.012 + f * 0.012 + k) * 25;
        ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
    }
    // montañas nevadas
    const off = camX * 0.1, sp = 240;
    for (let i = Math.floor(off / sp) - 1; i < Math.floor(off / sp) + 7; i++) {
      const x = i * sp - off, h = 170 + this.hash(i * 4.1) * 120;
      this.poly(ctx, [x - 80, VIEW_H - 50, x + sp / 2, VIEW_H - 50 - h, x + sp + 80, VIEW_H - 50], '#7d93c4');
      this.poly(ctx, [x + sp / 2 - 50, VIEW_H - 50 - h + 60, x + sp / 2, VIEW_H - 50 - h, x + sp / 2 + 50, VIEW_H - 50 - h + 60, x + sp / 2 + 20, VIEW_H - 50 - h + 48, x + sp / 2, VIEW_H - 50 - h + 62, x + sp / 2 - 22, VIEW_H - 50 - h + 46], '#f4faff');
    }
    // pinos nevados
    const off2 = camX * 0.4, sp2 = 110;
    for (let i = Math.floor(off2 / sp2) - 1; i < Math.floor(off2 / sp2) + 11; i++) {
      const x = i * sp2 - off2 + this.hash(i * 2) * 40, s = 0.8 + this.hash(i * 7) * 0.5, by = VIEW_H - 40;
      ctx.fillStyle = '#4a3420'; ctx.fillRect(x - 4, by - 20 * s, 8, 24 * s);
      for (let k = 0; k < 3; k++) {
        const y = by - 20 * s - k * 26 * s, w = (40 - k * 10) * s;
        this.poly(ctx, [x - w, y, x, y - 40 * s, x + w, y], '#2d5a4a');
        this.poly(ctx, [x - w * 0.6, y - 16 * s, x, y - 40 * s, x + w * 0.6, y - 16 * s], '#f4faff');
      }
    }
    // copos de nieve
    for (let i = 0; i < 60; i++) {
      const x = ((this.hash(i) * VIEW_W + Math.sin(f * 0.02 + i) * 20 - camX * 0.6) % VIEW_W + VIEW_W) % VIEW_W;
      const y = (this.hash(i * 3.7) * VIEW_H + f * (0.6 + this.hash(i * 1.3))) % VIEW_H;
      this.circle(ctx, x, y, 1.5 + this.hash(i * 9) * 1.5, 'rgba(255,255,255,0.85)');
    }
  },

  bgVolcano(ctx, camX, f) {
    ctx.fillStyle = this.grad(ctx, 'volcano', ['#1a0a12', 0, '#4a1420', 0.5, '#a8341c', 0.85, '#ff7a2a', 1]);
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // volcanes lejanos
    const off = camX * 0.12, sp = 420;
    for (let i = Math.floor(off / sp) - 1; i < Math.floor(off / sp) + 4; i++) {
      const x = i * sp - off + 60, h = 220 + this.hash(i) * 80, by = VIEW_H - 60;
      this.poly(ctx, [x - 160, by, x - 30, by - h, x + 30, by - h, x + 160, by], '#2a1418');
      this.poly(ctx, [x - 30, by - h, x + 30, by - h, x + 18, by - h + 30, x, by - h + 50, x - 16, by - h + 26], '#ff6a1a');
      // humo
      for (let k = 0; k < 4; k++) {
        const t = (f * 0.4 + k * 40 + i * 17) % 160;
        this.circle(ctx, x + Math.sin(t * 0.05 + i) * 20, by - h - t, 18 + t * 0.2, `rgba(60,40,45,${0.5 * (1 - t / 160)})`);
      }
      // gotas de lava
      for (let k = 0; k < 3; k++) {
        const t = (f + k * 37 + i * 50) % 90;
        const lx = x + (k - 1) * 30 * (t / 90), ly = by - h - 60 * Math.sin(t / 90 * Math.PI);
        this.circle(ctx, lx, ly, 4, '#ffb02e');
      }
    }
    // rocas cercanas
    const off2 = camX * 0.35;
    for (let i = Math.floor(off2 / 260) - 1; i < Math.floor(off2 / 260) + 6; i++) {
      const x = i * 260 - off2;
      this.poly(ctx, [x - 120, VIEW_H, x - 40, VIEW_H - 120 - this.hash(i) * 60, x + 60, VIEW_H - 90, x + 140, VIEW_H], '#1f1416');
    }
    // brasas que suben
    for (let i = 0; i < 40; i++) {
      const x = ((this.hash(i) * VIEW_W + Math.sin(f * 0.03 + i) * 15 - camX * 0.5) % VIEW_W + VIEW_W) % VIEW_W;
      const y = VIEW_H - ((this.hash(i * 2.3) * VIEW_H + f * (0.5 + this.hash(i * 5.1))) % VIEW_H);
      this.circle(ctx, x, y, 1.5 + this.hash(i * 3) * 1.5, `rgba(255,${150 + Math.floor(this.hash(i) * 80)},60,0.8)`);
    }
  },

  // ============================================================
  //  CASILLAS de los mundos nuevos
  // ============================================================
  tGroundX(ctx, level, ts, c, r, x, y) {
    const above = tileAt(level, c, r - 1);
    const top = !(above === T.GROUND || above === T.BLOCK);
    ctx.fillStyle = ts.ground; ctx.fillRect(x, y, TILE, TILE);
    const th = level.theme;
    if (th === 'beach') {
      this.circle(ctx, x + 6 + this.hash(c * 3 + r) * 20, y + 10 + this.hash(c + r * 5) * 16, 2, ts.groundDark);
      this.circle(ctx, x + 4 + this.hash(c * 7 + r) * 24, y + 6 + this.hash(c * 2 + r * 3) * 20, 1.5, '#fff3d0');
      if (top) {
        ctx.fillStyle = ts.groundTop; ctx.fillRect(x, y, TILE, 8);
        for (let i = 0; i < 4; i++) this.circle(ctx, x + 4 + i * 8, y + 8, 4, ts.groundTop);
        if (this.hash(c * 13) > 0.85) this.shell(ctx, x + 16, y + 2);
      }
    } else if (th === 'ice') {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + 4 + this.hash(c + r) * 10, y + 12); ctx.lineTo(x + 16, y + 20); ctx.lineTo(x + 26, y + 14); ctx.stroke();
      ctx.fillStyle = ts.groundDark; ctx.fillRect(x, y + TILE - 2, TILE, 2);
      if (top) {
        ctx.fillStyle = ts.groundTop; ctx.fillRect(x, y, TILE, 9);
        for (let i = 0; i < 4; i++) this.circle(ctx, x + 4 + i * 8, y + 9, 4.5, ts.groundTop);
        ctx.fillStyle = '#dff3ff'; ctx.fillRect(x, y + 2, TILE, 2);
        if (tileAt(level, c, r + 1) === T.EMPTY) for (let i = 0; i < 3; i++) this.poly(ctx, [x + 4 + i * 10, y + TILE, x + 8 + i * 10, y + TILE + 10, x + 12 + i * 10, y + TILE], '#d9f3ff');
      }
    } else {
      // volcán: basalto con grietas de lava
      ctx.strokeStyle = ts.crack; ctx.lineWidth = 2;
      if (this.hash(c * 5 + r * 3) > 0.45) {
        ctx.beginPath(); ctx.moveTo(x + 4, y + 8 + this.hash(c) * 12); ctx.lineTo(x + 14, y + 16); ctx.lineTo(x + 12, y + 28); ctx.stroke();
      }
      ctx.fillStyle = ts.groundDark; ctx.fillRect(x, y + TILE - 2, TILE, 2);
      if (top) {
        ctx.fillStyle = ts.groundTop; ctx.fillRect(x, y, TILE, 7);
        ctx.fillStyle = 'rgba(255,120,40,0.6)'; ctx.fillRect(x, y + 7, TILE, 2);
      }
    }
  },
  shell(ctx, x, y) {
    ctx.fillStyle = '#ff9fb2'; ctx.beginPath(); ctx.arc(x, y + 4, 5, Math.PI, 0); ctx.closePath(); ctx.fill();
    this.line(ctx, x, y + 4, x, y, '#e06a86', 1); this.line(ctx, x, y + 4, x - 3, y + 1, '#e06a86', 1); this.line(ctx, x, y + 4, x + 3, y + 1, '#e06a86', 1);
  },

  tBlockX(ctx, level, ts, c, r, x, y) {
    const th = level.theme;
    if (th === 'beach') {
      ctx.fillStyle = ts.block; ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = ts.blockDark;
      ctx.fillRect(x, y + 10, TILE, 2); ctx.fillRect(x, y + 21, TILE, 2);
      ctx.fillRect(x + (r % 2 ? 8 : 22), y, 2, 10); ctx.fillRect(x + (r % 2 ? 22 : 8), y + 12, 2, 9);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x, y, TILE, 3);
    } else if (th === 'ice') {
      this.box(ctx, x + 1, y + 1, TILE - 2, TILE - 2, 4, ts.block);
      ctx.strokeStyle = ts.blockDark; ctx.lineWidth = 2; this.rr(ctx, x + 1, y + 1, TILE - 2, TILE - 2, 4); ctx.stroke();
      this.poly(ctx, [x + 5, y + 5, x + 14, y + 5, x + 5, y + 14], 'rgba(255,255,255,0.8)');
      this.line(ctx, x + 18, y + 24, x + 26, y + 16, 'rgba(255,255,255,0.6)', 1.5);
    } else {
      ctx.fillStyle = ts.block; ctx.fillRect(x, y, TILE, TILE);
      this.poly(ctx, [x + 3, y + 3, x + 16, y + 6, x + 8, y + 18], '#3d3048');
      this.poly(ctx, [x + 18, y + 14, x + 29, y + 10, x + 26, y + 28], '#3d3048');
      this.line(ctx, x + 5, y + 5, x + 12, y + 7, 'rgba(200,150,255,0.5)', 1.5);
      ctx.fillStyle = ts.blockDark; ctx.fillRect(x, y + TILE - 2, TILE, 2);
    }
  },

  tPlatX(ctx, theme, ts, c, x, y) {
    if (theme === 'beach') {
      ctx.fillStyle = ts.plat; ctx.fillRect(x, y, TILE, 10);
      ctx.fillStyle = ts.platDark; ctx.fillRect(x + 15, y, 2, 10); ctx.fillRect(x, y + 10, TILE, 3);
      ctx.fillRect(x + 6, y + 13, 4, 10);
    } else if (theme === 'ice') {
      this.box(ctx, x - 1, y, TILE + 2, 11, 5, ts.plat);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + 2, TILE - 4, 2);
      this.poly(ctx, [x + 6, y + 10, x + 9, y + 20, x + 12, y + 10], ts.platDark);
      this.poly(ctx, [x + 20, y + 10, x + 22, y + 16, x + 25, y + 10], ts.platDark);
    } else {
      this.box(ctx, x, y, TILE, 11, 3, ts.plat);
      ctx.fillStyle = 'rgba(255,110,30,0.7)'; ctx.fillRect(x + 2, y + 11, TILE - 4, 2);
      this.line(ctx, x + 8, y + 3, x + 14, y + 7, '#ff6a1a', 1.5);
    }
  },

  tSpikesX(ctx, theme, ts, x, y) {
    if (theme === 'beach') {
      // erizos de mar
      for (const ox of [9, 23]) {
        const cy = y + 25;
        for (let i = 0; i < 10; i++) {
          const a = Math.PI + i * Math.PI / 9;
          this.line(ctx, x + ox, cy, x + ox + Math.cos(a) * 11, cy + Math.sin(a) * 11, '#3b1648', 1.5);
        }
        this.circle(ctx, x + ox, cy, 6.5, ts.spike);
        this.circle(ctx, x + ox - 2, cy - 2, 1.5, '#a46bc0');
      }
    } else {
      const col = theme === 'ice' ? ts.spike : ts.spike;
      for (let i = 0; i < 4; i++) {
        this.poly(ctx, [x + i * 8, y + TILE, x + i * 8 + 4, y + 12, x + i * 8 + 8, y + TILE], col);
        this.poly(ctx, [x + i * 8 + 4, y + TILE, x + i * 8 + 4, y + 12, x + i * 8 + 8, y + TILE], theme === 'ice' ? 'rgba(80,160,210,0.6)' : 'rgba(255,90,30,0.7)');
      }
    }
  },

  tLiquidIce(ctx, level, ts, c, r, x, y, f) {
    const top = tileAt(level, c, r - 1) !== T.LIQUID;
    ctx.fillStyle = ts.liquid;
    if (top) {
      const w1 = Math.sin((x + f) * 0.04) * 2;
      ctx.fillRect(x, y + 6 + w1, TILE, TILE - 6 - w1);
      ctx.fillStyle = 'rgba(220,245,255,0.7)'; ctx.fillRect(x, y + 5 + w1, TILE, 3);
      if (this.hash(c * 3) > 0.6) this.box(ctx, x + 6, y + 2 + w1, 18, 7, 3, '#e6f8ff');
    } else ctx.fillRect(x, y, TILE, TILE);
  },

  // Plataformas móviles de los mundos nuevos
  platX(ctx, x, y, pl, theme, f) {
    if (theme === 'beach') {
      // balsa de troncos
      for (let i = 0; i < pl.w; i += 12) this.box(ctx, x + i, y, 12, pl.h, 6, i % 24 ? '#b07a3e' : '#9a6630');
      this.line(ctx, x + 2, y + 5, x + pl.w - 2, y + 5, '#e8d6a8', 2);
      this.line(ctx, x + 2, y + 11, x + pl.w - 2, y + 11, '#e8d6a8', 2);
    } else if (theme === 'ice') {
      this.box(ctx, x - 2, y - 2, pl.w + 4, pl.h + 4, 8, '#e6f8ff');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4, y, pl.w - 8, 3);
      this.ellipse(ctx, x + pl.w / 2, y + pl.h + 3, pl.w / 2, 4, 'rgba(120,190,230,0.6)');
    } else {
      this.box(ctx, x, y, pl.w, pl.h, 6, '#3a2e30');
      this.ellipse(ctx, x + pl.w / 2, y + pl.h, pl.w / 2 - 4, 4, `rgba(255,120,40,${0.5 + 0.3 * Math.sin(f * 0.1)})`);
      this.line(ctx, x + 10, y + 4, x + 22, y + 9, '#ff6a1a', 2);
    }
  },

  // ============================================================
  //  OBJETOS: escudo, espadas elementales, vida extra
  // ============================================================
  shieldItem(ctx, cx, cy, r) {
    this.circle(ctx, cx, cy, r, '#8a5a1a');
    this.circle(ctx, cx, cy, r * 0.86, '#d9a441');
    this.circle(ctx, cx, cy, r * 0.58, '#b5651d');
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 === 0 ? r * 0.48 : r * 0.2;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    this.circle(ctx, cx - r * 0.45, cy - r * 0.45, r * 0.14, 'rgba(255,255,255,0.8)');
  },

  // Espada elemental en coordenadas de la mano (hoja hacia +x)
  elementSword(ctx, el, t) {
    const fire = el === 'fire';
    ctx.fillStyle = '#5e3b1a'; ctx.fillRect(-9, -2, 9, 4);
    ctx.fillStyle = fire ? '#ff5a1f' : '#3a9cc4'; ctx.fillRect(-1, -7, 4, 14);
    this.circle(ctx, -10, 0, 3, fire ? '#ffd23f' : '#e6f8ff');
    this.poly(ctx, [3, -4, 38, -4, 47, 0, 38, 4, 3, 4], fire ? '#ff7b1c' : '#8fe0ff');
    ctx.fillStyle = fire ? '#ffe14d' : '#ffffff'; ctx.fillRect(5, -1.5, 32, 2);
    if (fire) {
      for (let i = 0; i < 4; i++) {
        const fx = 10 + i * 9, fl = 5 + Math.sin(t * 0.5 + i * 2) * 3;
        this.poly(ctx, [fx - 3, -4, fx, -4 - fl, fx + 3, -4], i % 2 ? '#ffb02e' : '#ffe14d');
      }
    } else {
      this.poly(ctx, [14, -4, 17, -9, 20, -4], '#e6f8ff');
      this.poly(ctx, [28, 4, 31, 9, 34, 4], '#e6f8ff');
    }
  },

  lifeItem(ctx, cx, cy, t) {
    this.circle(ctx, cx, cy, 19 + Math.sin(t * 0.1) * 2, 'rgba(125,255,154,0.25)');
    this.ninjaHead(ctx, cx, cy, 12);
    this.text(ctx, '+1', cx + 12, cy - 12, 14, '#7dff9a');
  },

  // ============================================================
  //  ENEMIGOS NUEVOS
  // ============================================================
  scorpion(ctx, e) {
    const t = e.t, moving = Math.abs(e.vx) > 0.1;
    // patas
    for (let i = 0; i < 4; i++) {
      const lx = -14 + i * 8, sw = moving ? Math.sin(t * 0.4 + i) * 3 : 0;
      this.line(ctx, lx, -8, lx - 4 + sw, 0, '#6b3412', 2);
    }
    // cola curvada sobre la espalda
    ctx.strokeStyle = '#a65a22'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const st = Math.sin(t * 0.1) * 3;
    ctx.beginPath(); ctx.moveTo(-14, -10); ctx.quadraticCurveTo(-30, -24, -18 + st, -34); ctx.quadraticCurveTo(-8 + st, -38, -4 + st, -30); ctx.stroke();
    this.poly(ctx, [-4 + st, -32, 2 + st, -26, -6 + st, -26], '#3a1a08');
    // cuerpo
    this.ellipse(ctx, -2, -10, 17, 7, '#b5652a');
    for (let i = 0; i < 3; i++) this.line(ctx, -12 + i * 7, -16, -12 + i * 7, -5, '#8b4a1f', 1.5);
    // pinzas
    for (const s of [-1, 1]) {
      this.line(ctx, 12, -10 + s * 2, 20, -13 + s * 5, '#a65a22', 4);
      this.ellipse(ctx, 23, -14 + s * 6, 5, 3.5, '#b5652a', s * 0.3);
      this.line(ctx, 25, -14 + s * 6, 29, -14 + s * 4, '#6b3412', 2);
    }
    this.circle(ctx, 13, -13, 2.2, '#111');
    this.circle(ctx, 13.5, -13.5, 0.8, '#fff');
  },

  fireling(ctx, e) {
    const t = e.t, h = e.h, w = e.w;
    const fl = Math.sin(t * 0.4) * 3;
    this.ellipse(ctx, 0, -h * 0.4, w * 0.65, h * 0.55, 'rgba(255,120,40,0.3)');
    ctx.fillStyle = '#ff5a1f';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -4);
    ctx.quadraticCurveTo(-w / 2 - 2, -h * 0.7, -w * 0.2, -h - fl);
    ctx.quadraticCurveTo(-w * 0.05, -h * 0.75, w * 0.1, -h - 6 + fl);
    ctx.quadraticCurveTo(w * 0.2, -h * 0.7, w * 0.35, -h * 0.9 - fl);
    ctx.quadraticCurveTo(w / 2 + 2, -h * 0.5, w / 2, -4);
    ctx.quadraticCurveTo(0, 2, -w / 2, -4);
    ctx.fill();
    this.ellipse(ctx, 0, -h * 0.32, w * 0.32, h * 0.3, '#ffb02e');
    this.ellipse(ctx, 0, -h * 0.25, w * 0.18, h * 0.16, '#ffe14d');
    this.circle(ctx, -4, -h * 0.5, 3, '#2a0a00'); this.circle(ctx, 6, -h * 0.5, 3, '#2a0a00');
    this.line(ctx, -8, -h * 0.64, -1, -h * 0.58, '#2a0a00', 1.6);
    this.line(ctx, 10, -h * 0.64, 3, -h * 0.58, '#2a0a00', 1.6);
    this.box(ctx, -3, -h * 0.34, 8, 3, 1, '#2a0a00');
  },

  // ============================================================
  //  JEFES NUEVOS (origen: pies, mirando a la derecha)
  // ============================================================
  bossX(ctx, b) {
    ctx.translate(Math.round(b.x + b.w / 2), Math.round(b.y + b.h));
    if (b.kind === 'witchSand') {
      ctx.globalAlpha *= b.alpha == null ? 1 : b.alpha;
      ctx.scale(b.facing, 1);
      this.witch(ctx, b);
    } else if (b.kind === 'iceKill') {
      ctx.scale(b.facing, 1);
      this.iceGolem(ctx, b);
    } else {
      ctx.scale(b.facing, 1);
      this.lavaMonster(ctx, b);
    }
  },

  witch(ctx, b) {
    const t = b.t, w = b.w, h = b.h;
    const casting = b.mouth > 0 || b.state === 'cast';
    // remolino de arena (en vez de piernas)
    for (let i = 0; i < 4; i++) {
      const a = t * 0.2 + i * 1.6;
      this.ellipse(ctx, Math.cos(a) * 8, -6 - i * 5, 20 - i * 3, 5, i % 2 ? '#d9b26f' : '#e8c88a');
    }
    // vestido
    this.poly(ctx, [-w * 0.45, -14, w * 0.45, -14, w * 0.2, -h * 0.62, -w * 0.2, -h * 0.62], '#b07a3a');
    this.poly(ctx, [-w * 0.3, -14, -w * 0.15, -14, -w * 0.08, -h * 0.6, -w * 0.14, -h * 0.6], '#8a5a24');
    this.poly(ctx, [w * 0.3, -14, w * 0.15, -14, w * 0.08, -h * 0.6, w * 0.14, -h * 0.6], '#8a5a24');
    ctx.fillStyle = '#7b3fa0'; ctx.fillRect(-w * 0.22, -h * 0.5, w * 0.44, 5);
    // brazo y bastón
    const raise = casting ? -12 : 0;
    this.line(ctx, w * 0.12, -h * 0.56, w * 0.36, -h * 0.46 + raise, '#e8c88a', 5);
    this.line(ctx, w * 0.38, -h * 0.75 + raise, w * 0.42, -4 + raise, '#6b4a2b', 4);
    const orb = casting ? 9 + Math.sin(t * 0.5) * 2 : 7;
    this.circle(ctx, w * 0.38, -h * 0.78 + raise, orb + 4, 'rgba(255,210,120,0.35)');
    this.circle(ctx, w * 0.38, -h * 0.78 + raise, orb, '#f3d38a');
    this.line(ctx, -w * 0.12, -h * 0.56, -w * 0.3, -h * 0.4, '#e8c88a', 5);
    // pelo de arena
    this.poly(ctx, [-13, -h * 0.75, 13, -h * 0.75, 18, -h * 0.5, -18, -h * 0.5], '#d9b26f');
    // cabeza
    this.circle(ctx, 0, -h * 0.72, 12, '#e8c88a');
    this.circle(ctx, 4, -h * 0.74, 2.6, '#ff8c1a'); this.circle(ctx, -4, -h * 0.74, 2.6, '#ff8c1a');
    this.line(ctx, -8, -h * 0.79, -1, -h * 0.765, '#5a3a1e', 1.8);
    this.line(ctx, 8, -h * 0.79, 1, -h * 0.765, '#5a3a1e', 1.8);
    ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(1, -h * 0.68, 5, 0.2, Math.PI - 0.2); ctx.stroke();
    this.poly(ctx, [8, -h * 0.71, 14, -h * 0.69, 9, -h * 0.67], '#e8c88a'); // nariz puntiaguda
    // sombrero de bruja
    this.ellipse(ctx, 0, -h * 0.81, 22, 5, '#6b4a2b');
    ctx.fillStyle = '#6b4a2b';
    ctx.beginPath(); ctx.moveTo(-13, -h * 0.82); ctx.lineTo(13, -h * 0.82);
    ctx.quadraticCurveTo(4, -h * 1.0, -12, -h * 1.16 + Math.sin(t * 0.05) * 2); ctx.quadraticCurveTo(-6, -h * 1.0, -13, -h * 0.82); ctx.fill();
    ctx.fillStyle = '#7b3fa0'; ctx.fillRect(-12, -h * 0.86, 24, 4);
    this.circle(ctx, 0, -h * 0.84, 2.5, '#ffe14d');
  },

  iceGolem(ctx, b) {
    const t = b.t, w = b.w, h = b.h;
    const walk = Math.abs(b.vx) > 0.1 ? Math.sin(t * 0.18) * 4 : 0;
    const ice = '#9fdcf5', dark = '#4fa3c7', shine = '#e6f8ff';
    // piernas
    this.box(ctx, -w * 0.32, -h * 0.26 - walk, w * 0.24, h * 0.26 + walk, 6, dark);
    this.box(ctx, w * 0.08, -h * 0.26 + walk, w * 0.24, h * 0.26 - walk, 6, dark);
    // brazos (uno levantado al lanzar)
    const throwing = b.state === 'throw' && b.mouth > 0;
    this.box(ctx, -w * 0.58, -h * 0.74, w * 0.2, h * 0.42, 8, dark);
    ctx.save(); ctx.translate(w * 0.42, -h * 0.7); ctx.rotate(throwing ? -2.2 : b.state === 'roll' ? -0.6 : 0);
    this.box(ctx, -w * 0.1, 0, w * 0.2, h * 0.42, 8, dark);
    if (b.state === 'roll' && b.timer > 20) this.circle(ctx, 0, h * 0.46, 14, '#ffffff');
    if (b.state === 'throw') this.circle(ctx, 0, h * 0.44, 9, '#bdefff');
    ctx.restore();
    // cuerpo
    this.box(ctx, -w * 0.42, -h * 0.82, w * 0.84, h * 0.6, 14, ice);
    this.poly(ctx, [-w * 0.36, -h * 0.78, -w * 0.1, -h * 0.78, -w * 0.3, -h * 0.5], shine);
    this.line(ctx, -w * 0.1, -h * 0.5, w * 0.2, -h * 0.35, dark, 2);
    this.line(ctx, w * 0.2, -h * 0.35, w * 0.3, -h * 0.6, dark, 2);
    // cabeza con corona de cristales
    this.box(ctx, -w * 0.25, -h, w * 0.5, h * 0.24, 10, ice);
    for (let i = 0; i < 4; i++) this.poly(ctx, [-w * 0.24 + i * w * 0.14, -h * 0.97, -w * 0.18 + i * w * 0.14, -h * 1.12 - (i % 2) * 8, -w * 0.11 + i * w * 0.14, -h * 0.97], shine);
    const glow = 0.6 + 0.4 * Math.sin(t * 0.12);
    this.circle(ctx, -w * 0.08, -h * 0.9, 5, `rgba(40,120,255,${glow})`);
    this.circle(ctx, w * 0.12, -h * 0.9, 5, `rgba(40,120,255,${glow})`);
    this.line(ctx, -w * 0.18, -h * 0.97, -w * 0.02, -h * 0.93, '#1b4f72', 3);
    this.line(ctx, w * 0.22, -h * 0.97, w * 0.06, -h * 0.93, '#1b4f72', 3);
    const open = b.mouth > 0 ? 8 : 3;
    this.box(ctx, -w * 0.14, -h * 0.84, w * 0.3, open + 2, 3, '#1b4f72');
    for (let i = 0; i < 4; i++) this.poly(ctx, [-w * 0.12 + i * w * 0.07, -h * 0.84, -w * 0.1 + i * w * 0.07, -h * 0.84 + 6, -w * 0.08 + i * w * 0.07, -h * 0.84], '#ffffff');
    // hombreras de hielo
    this.poly(ctx, [-w * 0.5, -h * 0.74, -w * 0.44, -h * 0.92, -w * 0.36, -h * 0.76], shine);
    this.poly(ctx, [w * 0.36, -h * 0.76, w * 0.44, -h * 0.92, w * 0.5, -h * 0.74], shine);
  },

  lavaMonster(ctx, b) {
    const t = b.t, w = b.w, h = b.h;
    const cool = b.state === 'cool';
    const rock = cool ? '#6b6466' : '#3a2a2a', rockDark = cool ? '#4a4446' : '#241818';
    const glow = cool ? 'rgba(255,120,40,0.25)' : `rgba(255,${120 + Math.floor(60 * Math.sin(t * 0.2))},40,1)`;
    const walk = Math.abs(b.vx) > 0.1 ? Math.sin(t * 0.2) * 4 : 0;
    // llamas en la cabeza
    if (!cool) {
      for (let i = 0; i < 5; i++) {
        const fx = -w * 0.32 + i * w * 0.16, fl = 18 + Math.sin(t * 0.4 + i * 1.7) * 8;
        this.poly(ctx, [fx - 10, -h * 0.82, fx, -h * 0.82 - fl, fx + 10, -h * 0.82], i % 2 ? '#ffb02e' : '#ff5a1f');
        this.poly(ctx, [fx - 5, -h * 0.82, fx, -h * 0.82 - fl * 0.6, fx + 5, -h * 0.82], '#ffe14d');
      }
    }
    // piernas
    this.box(ctx, -w * 0.32, -h * 0.22 - walk, w * 0.24, h * 0.22 + walk, 8, rockDark);
    this.box(ctx, w * 0.08, -h * 0.22 + walk, w * 0.24, h * 0.22 - walk, 8, rockDark);
    // cuerpo
    this.ellipse(ctx, 0, -h * 0.5, w * 0.48, h * 0.38, rock);
    // grietas brillantes
    ctx.strokeStyle = glow; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const [x1, y1, x2, y2, x3, y3] of [[-0.3, -0.7, -0.15, -0.55, -0.25, -0.35], [0.25, -0.75, 0.1, -0.6, 0.22, -0.42], [-0.05, -0.4, 0.08, -0.28, -0.02, -0.18]]) {
      ctx.beginPath(); ctx.moveTo(x1 * w, y1 * h); ctx.lineTo(x2 * w, y2 * h); ctx.lineTo(x3 * w, y3 * h); ctx.stroke();
    }
    // núcleo de lava
    this.circle(ctx, 0, -h * 0.42, w * 0.13, glow);
    if (!cool) this.circle(ctx, 0, -h * 0.42, w * 0.07, '#ffe14d');
    // brazos
    const throwing = b.state === 'bombs';
    this.ellipse(ctx, -w * 0.5, -h * 0.45, w * 0.13, h * 0.18, rockDark, 0.3);
    ctx.save(); ctx.translate(w * 0.46, -h * 0.55); ctx.rotate(throwing ? -1.4 + Math.sin(t * 0.2) * 0.3 : 0.3);
    this.ellipse(ctx, 0, h * 0.12, w * 0.13, h * 0.18, rockDark);
    if (throwing) { this.circle(ctx, 0, h * 0.3, 10, '#222'); this.circle(ctx, 4, h * 0.27, 3, '#666'); }
    ctx.restore();
    // cara
    const ey = -h * 0.66;
    if (cool) {
      this.line(ctx, -w * 0.2, ey, -w * 0.06, ey, '#2a2224', 3);
      this.line(ctx, w * 0.06, ey, w * 0.2, ey, '#2a2224', 3);
      this.text(ctx, 'z', w * 0.3, -h * 0.95 - (t % 60) * 0.3, 16, '#ffffff');
    } else {
      this.circle(ctx, -w * 0.13, ey, 6, '#ffe14d'); this.circle(ctx, w * 0.13, ey, 6, '#ffe14d');
      this.circle(ctx, -w * 0.11, ey, 2.5, '#5a0a00'); this.circle(ctx, w * 0.15, ey, 2.5, '#5a0a00');
      this.line(ctx, -w * 0.24, ey - 10, -w * 0.06, ey - 5, '#120808', 3);
      this.line(ctx, w * 0.24, ey - 10, w * 0.06, ey - 5, '#120808', 3);
    }
    const mo = b.mouth > 0 ? 12 : 5;
    this.box(ctx, -w * 0.14, -h * 0.55, w * 0.28, mo, 4, cool ? '#2a2224' : '#5a0a00');
    if (b.mouth > 0) this.box(ctx, -w * 0.1, -h * 0.55 + 3, w * 0.2, mo - 5, 3, '#ffb02e');
  },

  // ============================================================
  //  PROYECTILES NUEVOS
  // ============================================================
  projectileX(ctx, p, cx, cy) {
    switch (p.kind) {
      case 'tornado': {
        for (let i = 0; i < 6; i++) {
          const yy = p.y + p.h - 4 - i * 9, rx = 6 + i * 2.6;
          const ox = Math.sin(p.t * 0.4 + i * 0.9) * 4;
          this.ellipse(ctx, cx + ox, yy, rx, 4, i % 2 ? 'rgba(232,200,138,0.85)' : 'rgba(210,173,106,0.85)');
        }
        for (let i = 0; i < 3; i++) {
          const a = p.t * 0.3 + i * 2;
          this.circle(ctx, cx + Math.cos(a) * 14, p.y + p.h - 10 - i * 14, 2, '#c9a05a');
        }
        break;
      }
      case 'snowball':
        this.circle(ctx, cx, cy, 14, '#ffffff');
        this.circle(ctx, cx + 3, cy + 4, 9, '#e6f0f8');
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.t * 0.15 * Math.sign(p.vx || 1));
        this.circle(ctx, 6, -4, 2, '#cfe0ee'); this.circle(ctx, -5, 5, 2.5, '#cfe0ee');
        ctx.restore();
        break;
      case 'iceball':
        this.circle(ctx, cx, cy, 10, '#8fd8ff');
        this.circle(ctx, cx - 3, cy - 3, 4, '#ffffff');
        this.circle(ctx, cx - p.vx * 2, cy - p.vy * 2, 6, 'rgba(190,240,255,0.4)');
        break;
      case 'icicle': {
        const sx = p.delay > 0 ? (Math.random() - 0.5) * 3 : 0;
        if (p.delay > 0) this.circle(ctx, cx, p.y + 6, 14, `rgba(255,80,80,${0.25 + 0.2 * Math.sin(p.t * 0.6)})`);
        this.poly(ctx, [p.x + sx, p.y, p.x + p.w + sx, p.y, cx + sx, p.y + p.h], '#d9f3ff');
        this.poly(ctx, [p.x + sx, p.y, cx + sx, p.y, cx + sx, p.y + p.h], '#ffffff');
        break;
      }
      case 'bomb': {
        const flash = p.fuse < 25 && p.fuse % 6 < 3;
        this.circle(ctx, cx, cy + 1, 11, flash ? '#ff3b3b' : '#222');
        this.circle(ctx, cx - 4, cy - 3, 3, flash ? '#ffb3b3' : '#666');
        this.line(ctx, cx + 4, cy - 9, cx + 8, cy - 14, '#8b5a2b', 2);
        this.circle(ctx, cx + 8, cy - 15, 3 + Math.random() * 2, Math.random() < 0.5 ? '#ffe14d' : '#ff7b1c');
        break;
      }
    }
  },

  // ============================================================
  //  ESCENA FINAL: la mazmorra
  // ============================================================
  dungeon(ctx, f) {
    ctx.fillStyle = '#231c2e'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // ladrillos
    for (let r = 0; r < 15; r++) {
      for (let c = -1; c < 17; c++) {
        const x = c * 64 + (r % 2 ? 32 : 0), y = r * 32;
        ctx.fillStyle = this.hash(r * 17 + c) > 0.5 ? '#2f2640' : '#2b2339';
        ctx.fillRect(x + 1, y + 1, 62, 30);
      }
    }
    // ventana con barrotes y luna
    this.box(ctx, 120, 90, 80, 90, 40, '#0f1a3a');
    this.circle(ctx, 165, 120, 18, '#fff3c4');
    ctx.fillStyle = '#555';
    for (let i = 0; i < 4; i++) ctx.fillRect(130 + i * 20, 90, 4, 90);
    ctx.fillStyle = 'rgba(255,243,196,0.06)';
    ctx.beginPath(); ctx.moveTo(120, 180); ctx.lineTo(200, 180); ctx.lineTo(320, 470); ctx.lineTo(160, 470); ctx.closePath(); ctx.fill();
    // cadenas
    for (const x of [300, 860]) {
      for (let i = 0; i < 8; i++) this.ellipse(ctx, x, 20 + i * 14, 4, 7, '#777', 0);
      this.box(ctx, x - 10, 130, 20, 8, 3, '#666');
    }
    // antorchas
    for (const x of [60, 420, 900]) {
      this.box(ctx, x - 4, 200, 8, 30, 2, '#5e3b1a');
      const fl = Math.sin(f * 0.3 + x) * 4;
      this.circle(ctx, x, 190, 40, 'rgba(255,160,60,0.12)');
      this.poly(ctx, [x - 10, 200, x, 172 + fl, x + 10, 200], '#ff7b1c');
      this.poly(ctx, [x - 5, 200, x, 182 + fl, x + 5, 200], '#ffe14d');
    }
    // suelo
    ctx.fillStyle = '#3a3048'; ctx.fillRect(0, ENDING.floor, VIEW_W, VIEW_H - ENDING.floor);
    ctx.fillStyle = '#4a3f5a'; ctx.fillRect(0, ENDING.floor, VIEW_W, 6);
    for (let i = 0; i < 16; i++) { ctx.fillStyle = '#2f2640'; ctx.fillRect(i * 64 + 10, ENDING.floor + 20, 2, 54); }
  },

  // Jaula: `lift` 0..1 sube los barrotes; `locked` dibuja el candado
  cage(ctx, cx, floor, lift, locked, f) {
    const w = 170, h = 175, x0 = cx - w / 2, top = floor - h;
    this.box(ctx, x0 - 6, top - 12, w + 12, 14, 4, '#5a5266');
    this.box(ctx, x0 - 6, floor - 4, w + 12, 8, 3, '#5a5266');
    ctx.save();
    ctx.globalAlpha = 1 - lift * 0.7;
    const up = lift * (h - 10);
    for (let i = 0; i <= 8; i++) {
      const x = x0 + i * (w / 8);
      this.box(ctx, x - 2.5, top + 2 - up, 5, h - 6, 2, '#8a8296');
      this.line(ctx, x - 1, top + 6 - up, x - 1, floor - 10 - up, 'rgba(255,255,255,0.25)', 1);
    }
    ctx.fillStyle = '#7a7286'; ctx.fillRect(x0, top + h * 0.45 - up, w, 5);
    ctx.restore();
    if (locked) {
      const lx = ENDING.lockX, ly = ENDING.lockY;
      ctx.strokeStyle = '#b58a00'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(lx, ly - 6, 8, Math.PI, 0); ctx.stroke();
      this.box(ctx, lx - 11, ly - 6, 22, 18, 4, '#f5c518');
      this.circle(ctx, lx, ly + 2, 3, '#5a4400');
    }
  },

  // Papá (con barba) o mamá (pelirroja con gafas). Origen: pies. Miran a la izquierda.
  parent(ctx, x, footY, kind, f, happy, walking) {
    const dad = kind === 'dad';
    const s = 1.15;
    ctx.save();
    ctx.translate(x, footY);
    ctx.scale(-s, s);
    const sw = walking ? Math.sin(f * 0.3) * 5 : 0;
    const skin = '#f3c99d';
    // piernas
    this.box(ctx, -9 + sw * 0.3, -34, 8, 34, 3, dad ? '#3a5a8c' : skin);
    this.box(ctx, 1 - sw * 0.3, -34, 8, 34, 3, dad ? '#2f4a75' : skin);
    this.box(ctx, -11 + sw * 0.3, -4, 12, 5, 2, '#3a2a20');
    this.box(ctx, 0 - sw * 0.3, -4, 12, 5, 2, '#3a2a20');
    // cuerpo
    if (dad) this.box(ctx, -14, -70, 28, 40, 9, '#3f8f4f');
    else this.poly(ctx, [-12, -70, 12, -70, 19, -26, -19, -26], '#8e44ad');
    if (!dad) { ctx.fillStyle = '#b06ad0'; ctx.fillRect(-12, -52, 24, 4); }
    // brazos
    const armUp = happy;
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(sd * 13, -64);
      ctx.rotate(armUp ? sd * -2.6 + Math.sin(f * 0.2 + sd) * 0.2 : sd * 0.15);
      this.box(ctx, -3.5, 0, 7, 26, 3, dad ? '#3f8f4f' : '#8e44ad');
      this.circle(ctx, 0, 27, 4, skin);
      ctx.restore();
    }
    // cabeza
    const hy = -84;
    if (!dad) {
      // melena pelirroja (detrás)
      this.ellipse(ctx, 0, hy + 6, 17, 22, '#d9481c');
    }
    this.circle(ctx, 0, hy, 14, skin);
    // ojos y boca
    this.circle(ctx, -5, hy - 2, 1.8, '#222'); this.circle(ctx, 5, hy - 2, 1.8, '#222');
    if (dad) {
      // pelo corto y gran barba
      ctx.fillStyle = '#5a3a1e';
      ctx.beginPath(); ctx.arc(0, hy - 3, 14.5, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-14, hy - 2); ctx.quadraticCurveTo(-16, hy + 20, 0, hy + 24); ctx.quadraticCurveTo(16, hy + 20, 14, hy - 2);
      ctx.quadraticCurveTo(10, hy + 6, 0, hy + 7); ctx.quadraticCurveTo(-10, hy + 6, -14, hy - 2);
      ctx.fill();
      this.ellipse(ctx, -4, hy + 5, 5, 2.5, '#4a2e16', 0.2); this.ellipse(ctx, 4, hy + 5, 5, 2.5, '#4a2e16', -0.2);
      ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      if (happy) ctx.arc(0, hy + 8, 4, 0.2, Math.PI - 0.2); else ctx.arc(0, hy + 12, 4, Math.PI + 0.3, -0.3);
      ctx.stroke();
    } else {
      // flequillo pelirrojo
      ctx.fillStyle = '#d9481c';
      ctx.beginPath(); ctx.arc(0, hy - 3, 14.5, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
      this.ellipse(ctx, -8, hy - 9, 7, 4, '#e8602c', 0.4);
      // gafas
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(-5, hy - 2, 4.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(5, hy - 2, 4.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.5, hy - 2); ctx.lineTo(0.5, hy - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9.5, hy - 3); ctx.lineTo(-14, hy - 5); ctx.moveTo(9.5, hy - 3); ctx.lineTo(14, hy - 5); ctx.stroke();
      this.circle(ctx, -8, hy + 4, 2.4, 'rgba(255,120,140,0.5)'); this.circle(ctx, 8, hy + 4, 2.4, 'rgba(255,120,140,0.5)');
      ctx.strokeStyle = '#a0303a'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      if (happy) ctx.arc(0, hy + 4, 4, 0.2, Math.PI - 0.2); else ctx.arc(0, hy + 9, 3.5, Math.PI + 0.3, -0.3);
      ctx.stroke();
    }
    if (!happy && !walking) {
      // lagrimita
      this.ellipse(ctx, 7, hy + 4 + (f % 40) * 0.3, 1.5, 2.5, '#7cc8ff');
    }
    ctx.restore();
  },

  speech(ctx, x, y, str) {
    ctx.font = 'bold 18px "Trebuchet MS", Verdana, sans-serif';
    const w = ctx.measureText(str).width + 24;
    this.box(ctx, x - w / 2, y - 18, w, 36, 14, '#ffffff');
    this.poly(ctx, [x - 8, y + 16, x + 4, y + 16, x - 2, y + 30], '#ffffff');
    ctx.fillStyle = '#1b1030'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  },
});
