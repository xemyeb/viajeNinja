// Bot headless: recorre los 3 mundos en Node (sin navegador) para detectar errores.
// Uso: node tools/sim.js            -> modo "trampa" (invencible, daña al jefe) para verificar el flujo completo
//      node tools/sim.js --fair     -> sin trampas, cuenta muertes (bot torpe: solo orientativo)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FAIR = process.argv.includes('--fair');
const noop = () => {};
const ctx = new Proxy({}, {
  get(t, k) { if (k in t) return t[k]; if (k === 'createLinearGradient') return () => ({ addColorStop: noop }); if (k === 'measureText') return str => ({ width: String(str).length * 9 }); return noop; },
  set(t, k, v) { t[k] = v; return true; },
});
global.window = { addEventListener: noop };
global.document = { getElementById: () => ({ classList: { contains: () => true, remove: noop } }), querySelectorAll: () => [] };
global.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };

let src = '';
for (const f of ['config', 'audio', 'input', 'physics', 'entities', 'enemies', 'bosses', 'levels', 'art', 'art-extra', 'game']) {
  src += fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8') + '\n';
}
src += 'globalThis.G = { WORLDS, Game, Input, TILE };';
vm.runInThisContext(src, { filename: 'bundle.js' });
const { Game, Input, WORLDS, TILE } = G;

const canvas = { getContext: () => ctx, addEventListener: noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 544 }) };
Input.init(canvas);
const hold = new Set();
Input.down = a => hold.has(a);

let failed = false;
for (let w = 0; w < WORLDS.length; w++) {
  const g = new Game(canvas);
  g.inv.weapons = ['baston', 'espada', 'lunchacos', 'estrellas', 'arco'];
  g.lives = 99;
  g.loadWorld(w);
  let maxX = 0, deaths = 0, cleared = false;
  for (let f = 0; f < 60 * 300; f++) {
    hold.clear();
    const p = g.player;
    if (g.state === 'intro' && g.timer > 40) Input.pulses.add('start');
    if (g.state === 'gameover') Input.pulses.add('start');
    const dia = g.items.find(i => i.kind === 'diamond');
    if (dia) hold.add(dia.x > p.x ? 'right' : 'left');
    else if (g.portal) hold.add(g.portal.box().x > p.x ? 'right' : 'left');
    else hold.add('right');
    if (f % 40 < 14 && !g.bossDone) hold.add('jump');
    if (f % 9 === 0) Input.pulses.add('attack');
    if (g.hasDiamond) Input.pulses.add('diamond');
    if (!FAIR) {
      p.hearts = 5;
      if (g.boss && f % 3 === 0) { g.boss.invuln = 0; g.boss.hurt(g, 1); }
    }
    if (g.state === 'dying' && g.timer === 1) deaths++;
    g.update(); Input.endFrame();
    if (f % 5 === 0) g.draw();
    maxX = Math.max(maxX, p.x);
    if (g.state === 'levelclear') { cleared = true; break; }
  }
  if (!FAIR && !cleared) failed = true;
  console.log(`Mundo ${w + 1}: ${cleared ? 'SUPERADO' : 'NO superado'} · col máx ${Math.floor(maxX / TILE)}/${g.level.width} · muertes ${deaths} · estado ${g.state}`);
}
process.exit(failed ? 1 : 0);
