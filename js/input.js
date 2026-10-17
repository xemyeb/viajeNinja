'use strict';
// ============================================================
//  Entrada: teclado + botones táctiles
// ============================================================
const Input = {
  keymap: {
    ArrowLeft: ['left'], KeyA: ['left'],
    ArrowRight: ['right'], KeyD: ['right'],
    ArrowUp: ['jump', 'up'], KeyW: ['jump', 'up'], Space: ['jump'],
    ArrowDown: ['down'], KeyS: ['down'],
    KeyZ: ['attack'], KeyJ: ['attack'],
    KeyX: ['diamond'], KeyK: ['diamond'],
    KeyQ: ['prevWeapon'], KeyE: ['nextWeapon'],
    KeyC: ['armor'],
    KeyP: ['pause'], Escape: ['pause'],
    KeyM: ['mute'],
    KeyN: ['newgame'],
    Enter: ['start'], NumpadEnter: ['start'],
    Digit1: ['w1'], Digit2: ['w2'], Digit3: ['w3'], Digit4: ['w4'], Digit5: ['w5'], Digit6: ['w6'], Digit7: ['w7'],
    Numpad1: ['w1'], Numpad2: ['w2'], Numpad3: ['w3'], Numpad4: ['w4'], Numpad5: ['w5'], Numpad6: ['w6'], Numpad7: ['w7'],
  },
  actions: [],
  actionCodes: {},
  held: new Set(),
  touch: {},
  last: {},
  pulses: new Set(),
  tap: null,

  init(canvas) {
    for (const [code, acts] of Object.entries(this.keymap)) {
      for (const a of acts) {
        (this.actionCodes[a] = this.actionCodes[a] || []).push(code);
      }
    }
    this.actions = Object.keys(this.actionCodes);

    window.addEventListener('keydown', e => {
      const acts = this.keymap[e.code];
      Sound.init();
      if (!acts) return;
      e.preventDefault();
      if (!e.repeat) acts.forEach(a => this.pulses.add(a));
      this.held.add(e.code);
    });
    window.addEventListener('keyup', e => {
      if (this.keymap[e.code]) { e.preventDefault(); this.held.delete(e.code); }
    });
    window.addEventListener('blur', () => { this.held.clear(); this.touch = {}; });

    // Controles táctiles (tablets / móviles)
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const pad = document.getElementById('touch');
    if (isTouch && pad) pad.classList.remove('hidden');
    document.querySelectorAll('#touch button').forEach(b => {
      const a = b.dataset.a;
      const on = e => { e.preventDefault(); Sound.init(); this.touch[a] = true; this.pulses.add(a); b.classList.add('on'); };
      const off = e => { e.preventDefault(); this.touch[a] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
    });
    canvas.addEventListener('pointerdown', e => {
      Sound.init();
      const r = canvas.getBoundingClientRect();
      this.tap = { x: (e.clientX - r.left) * VIEW_W / r.width, y: (e.clientY - r.top) * VIEW_H / r.height };
      this.pulses.add('start');
    });
  },

  down(a) {
    if (this.touch[a]) return true;
    const codes = this.actionCodes[a];
    if (!codes) return false;
    for (const c of codes) if (this.held.has(c)) return true;
    return false;
  },
  pressed(a) {
    return this.pulses.has(a) || (this.down(a) && !this.last[a]);
  },
  endFrame() {
    for (const a of this.actions) this.last[a] = this.down(a);
    for (const a of Object.keys(this.touch)) this.last[a] = this.down(a);
    this.pulses.clear();
    this.tap = null;
  },
};
