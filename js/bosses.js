'use strict';
// ============================================================
//  Monstruos finales
// ============================================================
const BOSS_TYPES = {
  heavyMetal:      { name: 'Heavy Metal',          w: 92,  h: 100, hp: 17, helper: 'miniMetal' },
  dobleDragon:     { name: 'Doble Dragón',         w: 150, h: 104, hp: 16, helper: 'dragoncito' },
  caballeroOscuro: { name: 'El Caballero Oscuro',  w: 56,  h: 96,  hp: 23, helper: 'caballerito' },
  witchSand:       { name: 'Witch Sand',           w: 60,  h: 92,  hp: 15, helper: 'escorpion' },
  iceKill:         { name: 'Ice Kill',             w: 104, h: 112, hp: 26, helper: 'osoPolar', weak: 'fire' },
  llamarada:       { name: 'Llamarada Explosiva',  w: 96,  h: 104, hp: 24, helper: 'monstruitoFuego', weak: 'ice' },
};

// Estados en los que tocar al jefe no hace daño (¡momento de saltarle encima!)
const BOSS_HARMLESS = new Set(['dizzy', 'cool']);

class Boss {
  constructor(kind, cx, groundY, arena) {
    const d = BOSS_TYPES[kind];
    this.kind = kind; this.d = d; this.name = d.name;
    this.w = d.w; this.h = d.h;
    this.hp = d.hp; this.maxHp = d.hp;
    this.x = cx - this.w / 2; this.y = groundY - this.h;
    this.groundY = groundY;
    this.arena = arena; // { x0, x1 } en píxeles
    this.vx = 0; this.vy = 0;
    this.facing = -1; this.onGround = false;
    this.t = 0; this.invuln = 0; this.lastHit = -1;
    this.state = 'intro'; this.timer = 100;
    this.dying = 0; this.dead = false;
    this.summonT = 300; this.seq = 0; this.shots = 0;
    this.mouth = 0; this.mouthEl = 'fire';
    if (kind === 'dobleDragon') { this.hoverY = 60; this.y = -this.h - 20; }
    if (kind === 'witchSand') { this.hoverY = 110; this.y = -this.h - 20; this.alpha = 1; }
    this.ghost = false; // invisible e intocable (la bruja cuando se deshace en arena)
  }

  harmless() { return BOSS_HARMLESS.has(this.state); }

  get cx() { return this.x + this.w / 2; }

  hitbox() {
    if (this.kind === 'dobleDragon') return { x: this.x + this.w * 0.22, y: this.y + this.h * 0.35, w: this.w * 0.56, h: this.h * 0.65 };
    return { x: this.x + 6, y: this.y + 6, w: this.w - 12, h: this.h - 6 };
  }

  // Zona extra que hace daño (espadazo del Caballero Oscuro)
  attackBox() {
    if (this.kind === 'caballeroOscuro' && this.state === 'slash') {
      const r = 84;
      return this.facing > 0
        ? { x: this.x + this.w - 6, y: this.y + 10, w: r, h: this.h - 10 }
        : { x: this.x - r + 6, y: this.y + 10, w: r, h: this.h - 10 };
    }
    return null;
  }

  physics(g) {
    this.vy = Math.min(this.vy + PHYS.gravity, PHYS.maxFall);
    moveAndCollide(this, g.level);
  }

  setState(s, timer) { this.state = s; this.timer = timer; }

  hurt(g, dmg) {
    if (this.invuln > 0 || this.dying || this.dead || this.state === 'intro') return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.invuln = 20;
    Sound.play('bosshit');
    g.shake = Math.max(g.shake, 5);
    if (this.hp <= 0) {
      this.dying = 110; this.vx = 0;
      Sound.play('bossdie');
      g.clearHelpers();
    }
    return true;
  }

  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  update(g) {
    this.t++;
    if (this.invuln > 0) this.invuln--;
    if (this.mouth > 0) this.mouth--;
    if (this.dying) {
      this.dying--;
      if (this.t % 6 === 0) g.explosion(this.x + Math.random() * this.w, this.y + Math.random() * this.h);
      if (this.kind === 'dobleDragon' || this.kind === 'witchSand') { this.alpha = 1; this.ghost = false; this.y = Math.min(this.y + 1.5, this.groundY - this.h); }
      else { this.vx = 0; this.physics(g); }
      if (this.dying <= 0) { this.dead = true; g.onBossDefeated(this); }
      return;
    }
    if (this.kind === 'heavyMetal') this.updateHeavy(g);
    else if (this.kind === 'dobleDragon') this.updateDragon(g);
    else if (this.kind === 'caballeroOscuro') this.updateKnight(g);
    else if (this.kind === 'witchSand') this.updateWitch(g);
    else if (this.kind === 'iceKill') this.updateIce(g);
    else this.updateLava(g);
    this.summon(g);
  }

  // Cuando está herido llama a sus ayudantes
  summon(g) {
    if (this.state === 'intro' || this.hp > this.maxHp * 0.6) return;
    if (--this.summonT > 0) return;
    this.summonT = 480;
    if (g.enemies.filter(e => e.isHelper && !e.dead).length >= 2) return;
    const left = Math.random() < 0.5;
    const px = left ? this.arena.x0 + 80 : this.arena.x1 - 80;
    const flying = this.d.helper === 'dragoncito';
    const e = new Enemy(this.d.helper, Math.floor(px / TILE), flying ? 6 : GROUND_ROW - 1, { helper: true, facing: left ? 1 : -1 });
    g.enemies.push(e);
    g.puff(e.x + e.w / 2, e.y + e.h / 2, '#ffffff', 16);
  }

  // ---------------- HEAVY METAL ----------------
  //  Camina, salta creando ondas, lanza chatarra y usa su imán
  //  para atraer al ninja y absorber trozos de metal (¡se cura!).
  updateHeavy(g) {
    const p = g.player;
    const dx = (p.x + p.w / 2) - this.cx;
    switch (this.state) {
      case 'intro':
        this.vx = 0;
        if (--this.timer <= 0) this.setState('walk', 100);
        break;
      case 'walk':
        this.facing = dx >= 0 ? 1 : -1;
        this.vx = this.facing * 1.5;
        if (--this.timer <= 0) {
          const seq = ['jump', 'throw', 'magnet', 'jump', 'throw'];
          const s = seq[this.seq++ % seq.length];
          this.setState(s, s === 'throw' ? 72 : s === 'magnet' ? 150 : 0);
        }
        break;
      case 'jump':
        this.vy = -13;
        this.vx = clamp(dx / 55, -5, 5);
        this.setState('air', 0);
        break;
      case 'air':
        this.timer++;
        if (this.onGround && this.timer > 5) {
          this.vx = 0;
          g.shake = 14;
          Sound.play('thud');
          for (const s of [-1, 1]) {
            g.projectiles.push(new Projectile('wave', this.cx + s * this.w / 2, this.groundY - 11, s * 4.8, 0, 'enemy', 1, { life: 140 }));
          }
          this.setState('rest', 38);
        }
        break;
      case 'throw':
        this.vx = 0;
        this.facing = dx >= 0 ? 1 : -1;
        if (this.timer % 18 === 0) {
          g.projectiles.push(new Projectile('scrap', this.cx + this.facing * 30, this.y + 30, clamp(dx / 48, -6.5, 6.5), -9, 'enemy', 1, { gravity: 0.38 }));
          Sound.play('throw');
        }
        if (--this.timer <= 0) this.setState('walk', 70);
        break;
      case 'magnet': {
        this.vx = 0;
        this.facing = dx >= 0 ? 1 : -1;
        // ¡Si llevas armadura de metal te atrae más fuerte!
        const metal = p.inv.armor === 'metal';
        p.push = (dx > 0 ? -1 : 1) * (metal ? 1.9 : 1.15);
        if (this.timer % 32 === 0) {
          const sx = this.arena.x0 + 60 + Math.random() * (this.arena.x1 - this.arena.x0 - 120);
          g.projectiles.push(new Projectile('scrapIn', sx, 30, 0, 0, 'enemy', 1, { target: this, life: 420 }));
        }
        if (--this.timer <= 0) this.setState('walk', 70);
        break;
      }
      case 'rest':
        this.vx = 0;
        if (--this.timer <= 0) this.setState('walk', 65);
        break;
    }
    this.physics(g);
  }

  // ---------------- DOBLE DRAGÓN ----------------
  //  Vuela; la cabeza roja escupe fuego y la azul, hielo.
  //  Cada poco baja a descansar al suelo: ¡es el momento de atacar!
  updateDragon(g) {
    const p = g.player;
    const ax = this.arena.x0, aw = this.arena.x1 - this.arena.x0;
    switch (this.state) {
      case 'intro':
        this.y += (this.hoverY - this.y) * 0.04;
        this.x += (ax + aw / 2 - this.w / 2 - this.x) * 0.04;
        if (--this.timer <= 0) this.setState('fly', 120);
        break;
      case 'fly': case 'fire': case 'ice': case 'both': {
        const tx = ax + (aw - this.w) * (0.5 + 0.45 * Math.sin(this.t * 0.01));
        this.x += (tx - this.x) * 0.03;
        this.y += (this.hoverY + Math.sin(this.t * 0.05) * 14 - this.y) * 0.1;
        if (this.state !== 'fly' && this.timer % 26 === 0) {
          this.breathe(g, this.state === 'both' ? (this.shots++ % 2 ? 'ice' : 'fire') : this.state);
        }
        if (--this.timer <= 0) {
          if (this.state === 'fly') {
            const seq = ['fire', 'land', 'ice', 'land', 'both', 'land'];
            const s = seq[this.seq++ % seq.length];
            this.setState(s, s === 'land' ? 0 : s === 'both' ? 156 : 104);
          } else this.setState('fly', 90);
        }
        break;
      }
      case 'land':
        this.y += 3.2;
        if (this.y + this.h >= this.groundY) {
          this.y = this.groundY - this.h;
          this.setState('ground', 210);
          g.shake = 12; Sound.play('thud');
        }
        break;
      case 'ground': {
        const dx = (p.x + p.w / 2) - this.cx;
        this.facing = dx >= 0 ? 1 : -1;
        this.x = clamp(this.x + this.facing * 0.7, ax + 8, ax + aw - this.w - 8);
        if (--this.timer <= 0) this.setState('rise', 0);
        break;
      }
      case 'rise':
        this.y -= 2.2;
        if (this.y <= this.hoverY) this.setState('fly', 110);
        break;
    }
  }

  headPos(el) {
    return el === 'fire'
      ? { x: this.x + this.w * 0.14 - 18, y: this.y + this.h * 0.2 + 6 }
      : { x: this.x + this.w * 0.86 + 18, y: this.y + this.h * 0.2 + 6 };
  }

  breathe(g, el) {
    const p = g.player;
    const h = this.headPos(el);
    const dx = p.x + p.w / 2 - h.x, dy = p.y + p.h / 2 - h.y;
    const d = Math.hypot(dx, dy) || 1;
    g.projectiles.push(new Projectile(el, h.x, h.y, dx / d * 3.6, dy / d * 3.6, 'enemy', 1, { element: el, life: 300 }));
    this.mouth = 20; this.mouthEl = el;
    Sound.play(el);
  }

  // ---------------- EL CABALLERO OSCURO ----------------
  //  Espadazos de cerca, embestidas, saltos y ondas de espada.
  //  Tras chocar contra la pared se queda mareado.
  updateKnight(g) {
    const p = g.player;
    const dx = (p.x + p.w / 2) - this.cx;
    switch (this.state) {
      case 'intro':
        if (--this.timer <= 0) this.setState('walk', 90);
        break;
      case 'walk':
        this.facing = dx >= 0 ? 1 : -1;
        this.vx = this.facing * 1.75;
        if (Math.abs(dx) < 110 && this.onGround) { this.vx = 0; this.setState('slashWarn', 24); }
        else if (--this.timer <= 0) {
          const seq = ['chargeWarn', 'leap', 'waveWarn', 'leap', 'chargeWarn', 'waveWarn'];
          const s = seq[this.seq++ % seq.length];
          this.setState(s, s === 'leap' ? 0 : 24);
        }
        break;
      case 'slashWarn':
        this.vx = 0;
        if (--this.timer <= 0) { this.setState('slash', 14); Sound.play('swing'); }
        break;
      case 'slash':
        if (--this.timer <= 0) this.setState('rest', 30);
        break;
      case 'chargeWarn':
        this.vx = 0;
        this.facing = dx >= 0 ? 1 : -1;
        if (--this.timer <= 0) this.setState('charge', 70);
        break;
      case 'charge':
        this.vx = this.facing * 7;
        if (this.hitWall || --this.timer <= 0) {
          const wall = this.hitWall;
          this.vx = 0;
          if (wall) { g.shake = 10; Sound.play('thud'); }
          this.setState(wall ? 'dizzy' : 'rest', wall ? 85 : 30);
        }
        break;
      case 'leap':
        this.vy = -12.5;
        this.vx = clamp(dx / 50, -5.5, 5.5);
        this.setState('air', 0);
        break;
      case 'air':
        this.timer++;
        if (this.onGround && this.timer > 5) { this.vx = 0; g.shake = 10; Sound.play('thud'); this.setState('rest', 30); }
        break;
      case 'waveWarn':
        this.vx = 0;
        this.facing = dx >= 0 ? 1 : -1;
        if (--this.timer <= 0) {
          g.projectiles.push(new Projectile('swordwave', this.cx + this.facing * 40, this.groundY - 20, this.facing * 5.4, 0, 'enemy', 1, { life: 220 }));
          Sound.play('swing');
          this.setState('rest', 30);
        }
        break;
      case 'rest': case 'dizzy':
        this.vx = 0;
        if (--this.timer <= 0) this.setState('walk', 80);
        break;
    }
    this.physics(g);
  }

  // ---------------- WITCH SAND ----------------
  //  Flota sobre la arena y lanza tornados que recorren el suelo.
  //  Se deshace en arena, reaparece en el suelo y allí se la puede pisar.
  updateWitch(g) {
    const p = g.player;
    const ax = this.arena.x0, aw = this.arena.x1 - this.arena.x0;
    const dx = (p.x + p.w / 2) - this.cx;
    this.facing = dx >= 0 ? 1 : -1;
    switch (this.state) {
      case 'intro':
        this.y += (this.hoverY - this.y) * 0.04;
        this.x += (ax + aw * 0.7 - this.w / 2 - this.x) * 0.04;
        if (--this.timer <= 0) this.setState('float', 120);
        break;
      case 'float': case 'cast': {
        const tx = ax + (aw - this.w) * (0.5 + 0.42 * Math.sin(this.t * 0.012));
        this.x += (tx - this.x) * 0.03;
        this.y += (this.hoverY + Math.sin(this.t * 0.06) * 12 - this.y) * 0.1;
        if (this.state === 'cast' && this.timer % 45 === 0) this.tornado(g);
        if (--this.timer <= 0) {
          if (this.state === 'float') {
            const seq = ['cast', 'vanish', 'cast', 'vanish'];
            const s = seq[this.seq++ % seq.length];
            this.setState(s, s === 'cast' ? 135 : 40);
          } else this.setState('float', 90);
        }
        break;
      }
      case 'vanish':
        this.alpha = Math.max(0, this.alpha - 0.03);
        if (this.t % 3 === 0) g.particles.push(new Particle(this.x + Math.random() * this.w, this.y + Math.random() * this.h, (Math.random() - 0.5) * 2, 1, '#e8c88a', 30, 4, 0.1));
        if (--this.timer <= 0) {
          this.ghost = true;
          // reaparece en el suelo, lejos del ninja
          const side = (p.x + p.w / 2) < ax + aw / 2 ? 1 : -1;
          this.x = clamp(ax + aw / 2 + side * aw * 0.32 - this.w / 2, ax + 10, ax + aw - this.w - 10);
          this.y = this.groundY - this.h;
          this.setState('appear', 50);
        }
        break;
      case 'appear':
        if (this.t % 2 === 0) g.particles.push(new Particle(this.cx + (Math.random() - 0.5) * 50, this.groundY - 4, (Math.random() - 0.5) * 2, -2, '#e8c88a', 30, 4, 0.05));
        if (this.timer < 30) { this.ghost = false; this.alpha = Math.min(1, this.alpha + 0.04); }
        if (--this.timer <= 0) { this.alpha = 1; this.setState('ground', 260); }
        break;
      case 'ground':
        this.x = clamp(this.x + this.facing * 0.5, ax + 8, ax + aw - this.w - 8);
        if (this.timer === 150) this.tornado(g);
        if (--this.timer <= 0) this.setState('rise', 0);
        break;
      case 'rise':
        this.y -= 2;
        if (this.y <= this.hoverY) this.setState('float', 100);
        break;
    }
  }

  tornado(g) {
    const p = g.player;
    const dir = (p.x + p.w / 2) >= this.cx ? 1 : -1;
    const pr = new Projectile('tornado', this.cx + dir * 30, this.groundY - 40, dir * 2.4, 0, 'enemy', 1, { life: 400, gravity: 0.5 });
    g.projectiles.push(pr);
    this.mouth = 20;
    Sound.play('swing');
  }

  // ---------------- ICE KILL ----------------
  //  Lanza bolas de hielo en arco, hace rodar bolas de nieve
  //  y al pisotear el suelo caen carámbanos del techo.
  updateIce(g) {
    const p = g.player;
    const dx = (p.x + p.w / 2) - this.cx;
    switch (this.state) {
      case 'intro':
        if (--this.timer <= 0) this.setState('walk', 90);
        break;
      case 'walk':
        this.facing = dx >= 0 ? 1 : -1;
        this.vx = this.facing * 1.35;
        if (--this.timer <= 0) {
          const seq = ['throw', 'roll', 'stomp', 'throw', 'roll'];
          const s = seq[this.seq++ % seq.length];
          this.setState(s, s === 'throw' ? 80 : s === 'roll' ? 50 : 0);
        }
        break;
      case 'throw':
        this.vx = 0;
        this.facing = dx >= 0 ? 1 : -1;
        if (this.timer % 20 === 0) {
          g.projectiles.push(new Projectile('iceball', this.cx + this.facing * 40, this.y + 24, clamp(dx / 50, -6, 6), -8.5, 'enemy', 1, { gravity: 0.32 }));
          this.mouth = 14;
          Sound.play('ice');
        }
        if (--this.timer <= 0) this.setState('walk', 65);
        break;
      case 'roll':
        this.vx = 0;
        this.facing = dx >= 0 ? 1 : -1;
        if (this.timer === 20) {
          g.projectiles.push(new Projectile('snowball', this.cx + this.facing * (this.w / 2 + 16), this.groundY - 16, this.facing * 3.9, 0, 'enemy', 1, { life: 420 }));
          Sound.play('throw');
        }
        if (--this.timer <= 0) this.setState('rest', 30);
        break;
      case 'stomp':
        this.vx = 0;
        this.vy = -9;
        this.setState('air', 0);
        break;
      case 'air':
        this.timer++;
        if (this.onGround && this.timer > 5) {
          g.shake = 14; Sound.play('thud');
          // carámbanos que avisan temblando antes de caer
          const ax = this.arena.x0, aw = this.arena.x1 - this.arena.x0;
          for (let i = 0; i < 6; i++) {
            const x = ax + 60 + Math.random() * (aw - 120);
            g.projectiles.push(new Projectile('icicle', x, 20, 0, 0, 'enemy', 1, { gravity: 0.35, delay: 45 + i * 12, life: 300 }));
          }
          this.setState('rest', 45);
        }
        break;
      case 'rest':
        this.vx = 0;
        if (--this.timer <= 0) this.setState('walk', 70);
        break;
    }
    this.physics(g);
  }

  // ---------------- LLAMARADA EXPLOSIVA ----------------
  //  Lanza abanicos de fuego y bombas. Después se enfría y se vuelve
  //  de roca: entonces no quema y se le puede saltar encima.
  updateLava(g) {
    const p = g.player;
    const dx = (p.x + p.w / 2) - this.cx;
    if (this.state !== 'cool' && this.t % 4 === 0) {
      g.particles.push(new Particle(this.x + Math.random() * this.w, this.y + 10, (Math.random() - 0.5), -1.5, Math.random() < 0.5 ? '#ffb02e' : '#ff5a1f', 26, 4, -0.02));
    }
    switch (this.state) {
      case 'intro':
        if (--this.timer <= 0) this.setState('walk', 80);
        break;
      case 'walk':
        this.facing = dx >= 0 ? 1 : -1;
        this.vx = this.facing * 1.2;
        if (--this.timer <= 0) {
          const seq = ['fan', 'bombs', 'jump', 'fan', 'bombs'];
          const s = seq[this.seq++ % seq.length];
          this.setState(s, s === 'fan' ? 70 : s === 'bombs' ? 96 : 0);
        }
        break;
      case 'fan':
        this.vx = 0;
        this.facing = dx >= 0 ? 1 : -1;
        if (this.timer === 50 || this.timer === 20) {
          for (const a of [-0.45, -0.15, 0.15]) {
            g.projectiles.push(new Projectile('fire', this.cx + this.facing * 40, this.y + 34, this.facing * Math.cos(a) * 3.6, Math.sin(a) * 3.6, 'enemy', 1, { element: 'fire', life: 260 }));
          }
          this.mouth = 18;
          Sound.play('fire');
        }
        if (--this.timer <= 0) this.setState('walk', 70);
        break;
      case 'bombs':
        this.vx = 0;
        this.facing = dx >= 0 ? 1 : -1;
        if (this.timer % 32 === 0) {
          const k = 0.7 + Math.random() * 0.6;
          g.projectiles.push(new Projectile('bomb', this.cx + this.facing * 30, this.y + 10, clamp(dx / 60, -5, 5) * k, -9, 'enemy', 1, { gravity: 0.35, fuse: 80, life: 400 }));
          Sound.play('throw');
        }
        if (--this.timer <= 0) this.setState('cool', 170);
        break;
      case 'jump':
        this.vy = -12;
        this.vx = clamp(dx / 55, -5, 5);
        this.setState('air', 0);
        break;
      case 'air':
        this.timer++;
        if (this.onGround && this.timer > 5) {
          this.vx = 0; g.shake = 12; Sound.play('thud');
          for (const sdir of [-1, 1]) g.projectiles.push(new Projectile('fire', this.cx + sdir * 40, this.groundY - 14, sdir * 3.2, 0, 'enemy', 1, { element: 'fire', life: 160 }));
          this.setState('rest', 40);
        }
        break;
      case 'cool':
        this.vx = 0;
        if (--this.timer <= 0) { this.setState('walk', 80); Sound.play('fire'); }
        break;
      case 'rest':
        this.vx = 0;
        if (--this.timer <= 0) this.setState('walk', 80);
        break;
    }
    this.physics(g);
  }
}
