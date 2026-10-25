'use strict';
// ============================================================
//  Entidades: ninja, proyectiles, objetos, obstáculos...
// ============================================================

// ------------------------------------------------------------
//  El ninja protagonista
// ------------------------------------------------------------
class Player {
  constructor(x, y, inv) {
    this.w = 26;
    this.h = 46;
    this.inv = inv; // inventario compartido con Game (armas, armaduras)
    this.attackId = 0;
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.jumpsLeft = 1;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.invuln = 60;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.anim = 0;
    this.slow = 0;
    this.dropTimer = 0;
    this.push = 0;
    this.riding = null;
    this.prevBottom = y + this.h;
    this.bounced = false;
    this.flip = 0;
    this.regen = 0;
    this.flyE = FLY.energy;
    this.flying = false;
    this.dead = false;
    this.hearts = START_HEARTS;
    this.shield = this.maxShield();
  }

  maxShield() { return this.inv.armor ? ARMORS[this.inv.armor].shield : 0; }

  update(g) {
    this.anim++;
    if (this.invuln > 0) this.invuln--;
    if (this.attackTimer > 0) this.attackTimer--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.slow > 0) this.slow--;
    if (this.dropTimer > 0) this.dropTimer--;
    if (this.flip > 0) this.flip--;

    // La armadura se recupera poco a poco
    const maxS = this.maxShield();
    if (this.shield < maxS) {
      if (++this.regen >= SHIELD_REGEN_FRAMES) { this.regen = 0; this.shield++; }
    } else this.regen = 0;

    // Cambio de arma / armadura / diamante
    for (let i = 0; i < WEAPON_ORDER.length; i++) if (Input.pressed('w' + (i + 1))) g.selectWeapon(WEAPON_ORDER[i]);
    if (Input.pressed('nextWeapon')) g.cycleWeapon(1);
    if (Input.pressed('prevWeapon')) g.cycleWeapon(-1);
    if (Input.pressed('armor')) g.cycleArmor();
    if (Input.pressed('diamond')) g.throwDiamond();

    // Movimiento horizontal
    const dir = (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    const maxV = PHYS.runSpeed * (this.slow > 0 ? 0.55 : 1);
    const icy = this.onGround && g.level.theme === 'ice'; // el hielo resbala un poco
    if (dir !== 0) {
      this.vx += dir * (this.onGround ? PHYS.accel * (icy ? 0.45 : 1) : PHYS.airAccel);
      this.vx = clamp(this.vx, -maxV, maxV);
      if (this.attackTimer === 0) this.facing = dir;
    } else {
      this.vx *= this.onGround ? (icy ? 0.95 : PHYS.friction) : 0.9;
      if (Math.abs(this.vx) < 0.15) this.vx = 0;
    }

    // Salto y doble salto
    if (this.onGround) { this.coyote = PHYS.coyote; this.jumpsLeft = 1; this.bounced = false; }
    else if (this.coyote > 0) this.coyote--;
    if (Input.pressed('jump')) this.jumpBuf = PHYS.jumpBuffer;
    else if (this.jumpBuf > 0) this.jumpBuf--;

    if (this.jumpBuf > 0) {
      if (Input.down('down') && this.onGround && this.onOneWay(g)) {
        // bajar de una plataforma
        this.dropTimer = 14; this.jumpBuf = 0; this.coyote = 0; this.onGround = false; this.riding = null;
      } else if (this.coyote > 0) {
        this.vy = PHYS.jump; this.coyote = 0; this.jumpBuf = 0; this.onGround = false;
        this.riding = null;
        Sound.play('jump');
        g.dust(this.x + this.w / 2, this.y + this.h);
      } else if (this.jumpsLeft > 0) {
        this.vy = PHYS.doubleJump; this.jumpsLeft--; this.jumpBuf = 0; this.flip = 24; this.bounced = false;
        Sound.play('djump');
        g.puff(this.x + this.w / 2, this.y + this.h, '#ffffff', 8);
      }
    }
    if (!Input.down('jump') && this.vy < PHYS.jumpCut && !this.bounced) this.vy = PHYS.jumpCut;

    // Gravedad + colisiones
    this.vy = Math.min(this.vy + PHYS.gravity, PHYS.maxFall);
    // Vuelo con la espada láser: mantener el salto en el aire
    this.flying = false;
    if (this.inv.weapons.includes('espadaLaser')) {
      if (this.onGround) this.flyE = Math.min(FLY.energy, this.flyE + FLY.recharge);
      else if (Input.down('jump') && (this.jumpsLeft === 0 || this.vy > 0) && this.flyE > 0 && this.vy > -6) {
        this.vy = Math.max(this.vy - FLY.lift, FLY.maxUp);
        this.flyE--;
        this.flying = true;
        if (this.anim % 3 === 0) g.particles.push(new Particle(this.x + this.w / 2 - this.facing * 8, this.y + 30, (Math.random() - 0.5), 1.5, Math.random() < 0.5 ? '#ff4dd2' : '#7df9ff', 16, 4, 0));
      }
    }
    this.prevBottom = this.y + this.h;
    const baseVx = this.vx;
    this.vx += this.push;
    this.push = 0;
    this.lavaWalk = !!this.inv.escudo && LAVA_THEMES.has(g.level.theme);
    moveAndCollide(this, g.level, this.dropTimer > 0);
    if (!this.hitWall) this.vx = baseVx;
    if (this.y < -12) { this.y = -12; this.vy = Math.max(this.vy, 0); } // techo del cielo

    // Ataque
    if (Input.pressed('attack') && this.attackCooldown === 0) this.attack(g);
  }

  onOneWay(g) {
    if (this.riding) return true;
    const row = Math.floor((this.y + this.h + 1) / TILE);
    const l = Math.floor(this.x / TILE), r = Math.floor((this.x + this.w - 0.01) / TILE);
    let one = false;
    for (let c = l; c <= r; c++) {
      const t = tileAt(g.level, c, row);
      if (isSolid(t)) return false;
      if (t === T.PLATFORM) one = true;
    }
    return one;
  }

  attack(g) {
    const W = WEAPONS[this.inv.weapon];
    this.attackCooldown = W.cooldown;
    this.attackTimer = W.duration || 10;
    this.attackId++;
    if (W.type === 'proj') {
      const px = this.x + this.w / 2 + this.facing * 16;
      const py = this.y + 17;
      if (W.proj === 'star') g.projectiles.push(new Projectile('star', px, py, this.facing * W.speed, 0, 'player', W.dmg));
      else g.projectiles.push(new Projectile('arrow', px, py, this.facing * W.speed, -1.3, 'player', W.dmg, { gravity: 0.07 }));
      Sound.play('throw');
    } else {
      Sound.play('swing');
      if (W.shot) {
        // espadas especiales: llamarada, rayo de hielo o rayo láser
        const S = W.shot;
        g.projectiles.push(new Projectile(S.kind, this.x + this.w / 2 + this.facing * 30, this.y + 18, this.facing * S.speed, 0, 'player', S.dmg,
          { element: W.element, freeze: W.freeze, life: S.life }));
        Sound.play(W.element === 'fire' ? 'fire' : W.element === 'ice' ? 'ice' : 'laser');
      }
    }
  }

  // Zona que golpea el arma cuerpo a cuerpo (o null)
  meleeBox() {
    if (this.attackTimer <= 0) return null;
    const W = WEAPONS[this.inv.weapon];
    if (W.type !== 'melee') return null;
    if (W.both) return { x: this.x - W.range, y: this.y - 2, w: this.w + W.range * 2, h: 46 };
    return this.facing > 0
      ? { x: this.x + this.w - 6, y: this.y - 6, w: W.range, h: 50 }
      : { x: this.x - W.range + 6, y: this.y - 6, w: W.range, h: 50 };
  }

  hurt(g, dmg = 1, element = null, srcX = null) {
    if (this.invuln > 0 || this.dead || g.state !== 'playing') return false;
    const armor = this.inv.armor ? ARMORS[this.inv.armor] : null;
    if ((element === 'bomb' || element === 'lava') && this.inv.escudo) {
      g.floatText(this.x + this.w / 2, this.y - 8, '¡Escudo!', '#ffd166');
      Sound.play('clank');
      this.invuln = 20;
      return false;
    }
    if (element && armor && armor.immune === element) {
      g.floatText(this.x + this.w / 2, this.y - 8, '¡Inmune!', armor.shine);
      this.invuln = 20;
      return false;
    }
    if (this.shield > 0) {
      this.shield--;
      Sound.play('clank');
      g.sparks(this.x + this.w / 2, this.y + 20, armor ? armor.shine : '#fff', 10);
    } else {
      this.hearts -= dmg;
      Sound.play('hurt');
    }
    this.regen = 0;
    if (element === 'ice') this.slow = 100;
    this.invuln = INVULN_FRAMES;
    const from = srcX == null ? this.x + this.w / 2 + this.facing : srcX;
    this.vx = (this.x + this.w / 2 < from ? -1 : 1) * 5;
    this.vy = -6;
    this.bounced = true;
    g.shake = Math.max(g.shake, 8);
    if (this.hearts <= 0) g.playerDie();
    return true;
  }
}

// ------------------------------------------------------------
//  Proyectiles (del ninja, de enemigos y de amigos)
// ------------------------------------------------------------
const PROJ_SIZE = {
  star: [16, 16], arrow: [26, 8], fire: [20, 20], ice: [18, 18], scrap: [18, 18], scrapIn: [18, 18],
  wave: [26, 22], swordwave: [22, 40], diamond: [22, 22], friendFire: [18, 18],
  tornado: [30, 56], snowball: [28, 28], bomb: [22, 22], icicle: [16, 30], iceball: [18, 18],
  flame: [30, 24], iceRay: [40, 12], laser: [44, 8],
};
// Proyectiles enemigos que no se pueden romper (hay que saltarlos)
const UNBREAKABLE = new Set(['wave', 'swordwave', 'tornado']);

class Projectile {
  constructor(kind, x, y, vx, vy, owner, dmg = 1, opts = {}) {
    const s = PROJ_SIZE[kind] || [14, 14];
    this.kind = kind;
    this.w = s[0]; this.h = s[1];
    this.x = x - this.w / 2; this.y = y - this.h / 2;
    this.vx = vx; this.vy = vy;
    this.owner = owner;
    this.dmg = dmg;
    this.gravity = opts.gravity || 0;
    this.element = opts.element || ({ fire: 'fire', ice: 'ice', iceball: 'ice', snowball: 'ice', icicle: 'ice', bomb: 'bomb' })[kind] || null;
    this.freeze = opts.freeze || 0; // rayo de hielo: frames que congela
    this.fuse = opts.fuse || 70;   // bombas
    this.delay = opts.delay || 0;  // carámbanos: tiempo de aviso antes de caer
    this.life = opts.life || 240;
    this.target = opts.target || null;
    this.t = 0;
    this.dead = false;
  }

  update(g) {
    this.t++;
    if (--this.life <= 0) { this.dead = true; return; }

    if (this.kind === 'scrapIn' && this.target) {
      // chatarra atraída por el imán de Heavy Metal
      const tb = this.target.hitbox();
      const dx = tb.x + tb.w / 2 - (this.x + this.w / 2), dy = tb.y + tb.h / 2 - (this.y + this.h / 2);
      const d = Math.hypot(dx, dy) || 1;
      this.vx += dx / d * 0.18; this.vy += dy / d * 0.18;
      const sp = Math.hypot(this.vx, this.vy);
      if (sp > 2.8) { this.vx *= 2.8 / sp; this.vy *= 2.8 / sp; }
    }

    if (this.delay > 0) { this.delay--; return; }
    if (this.kind === 'bomb' || this.kind === 'snowball' || this.kind === 'tornado') { this.updateGround(g); return; }

    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;

    // estela de la llamarada y del rayo de hielo
    if (this.kind === 'flame' && this.t % 2 === 0) {
      g.particles.push(new Particle(cx - this.vx * 2, cy + (Math.random() - 0.5) * 14, -this.vx * 0.15, -0.5 - Math.random(),
        Math.random() < 0.5 ? '#ffb02e' : '#ff5a1f', 20, 5, -0.04));
    } else if (this.kind === 'laser' && this.t % 2 === 0) {
      g.particles.push(new Particle(cx - this.vx, cy + (Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 0.4,
        Math.random() < 0.5 ? '#ff4dd2' : '#ffffff', 12, 3, 0));
    } else if (this.kind === 'iceRay' && this.t % 2 === 0) {
      g.particles.push(new Particle(cx - this.vx, cy + (Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 0.6,
        Math.random() < 0.5 ? '#bdefff' : '#ffffff', 18, 3, 0));
    }

    if (this.kind === 'icicle') {
      if (isSolid(tileAt(g.level, Math.floor(cx / TILE), Math.floor((this.y + this.h) / TILE)))) {
        this.dead = true;
        g.sparks(cx, this.y + this.h, '#e6f8ff', 10);
        Sound.play('ice');
      }
      return;
    }

    if (this.kind === 'diamond') {
      const col = Math.floor(cx / TILE);
      const row = Math.floor((this.y + this.h) / TILE);
      if (isSolid(tileAt(g.level, Math.floor((cx + Math.sign(this.vx) * 10) / TILE), Math.floor(cy / TILE)))) this.vx = -this.vx * 0.5;
      if (this.vy > 0 && isSolid(tileAt(g.level, col, row))) {
        this.dead = true;
        g.openPortal(cx, row * TILE);
      } else if (this.y > levelBottom(g.level)) {
        this.dead = true;
        g.hasDiamond = true;
      }
      return;
    }

    if (this.kind === 'wave' || this.kind === 'swordwave') {
      const front = Math.floor((this.vx > 0 ? this.x + this.w : this.x) / TILE);
      if (isSolid(tileAt(g.level, front, Math.floor(cy / TILE)))) this.dead = true;
    } else if (this.kind !== 'scrapIn') {
      if (isSolid(tileAt(g.level, Math.floor(cx / TILE), Math.floor(cy / TILE)))) {
        this.dead = true;
        g.sparks(cx, cy, this.element === 'fire' ? '#ffb02e' : this.element === 'ice' ? '#bdefff' : '#ffffff', 5);
      }
    }
    if (this.y > levelBottom(g.level) + 40 || this.x < g.camX - 300 || this.x > g.camX + VIEW_W + 300) this.dead = true;
  }

  // Proyectiles que van por el suelo: bombas, bolas de nieve y tornados de arena
  updateGround(g) {
    this.vy = Math.min(this.vy + (this.gravity || 0.4), 10);
    const vx = this.vx;
    moveAndCollide(this, g.level);
    const cx = this.x + this.w / 2;
    if (this.kind === 'bomb') {
      if (this.onGround) this.vx = vx * 0.85;
      else this.vx = this.hitWall ? -vx * 0.5 : vx;
      if (--this.fuse <= 0) { this.dead = true; g.bombExplode(cx, this.y + this.h / 2); }
    } else {
      this.vx = vx;
      if (this.hitWall) {
        this.dead = true;
        g.puff(cx, this.y + this.h / 2, this.kind === 'snowball' ? '#ffffff' : '#e8c88a', 12);
      }
    }
    if (this.y > levelBottom(g.level) + 40) this.dead = true;
  }
}

// ------------------------------------------------------------
//  Partículas y textos flotantes
// ------------------------------------------------------------
class Particle {
  constructor(x, y, vx, vy, color, life = 30, size = 4, grav = 0.15, text = null) {
    Object.assign(this, { x, y, vx, vy, color, life, max: life, size, grav, text });
  }
  update() { this.vy += this.grav; this.x += this.vx; this.y += this.vy; this.life--; }
  get dead() { return this.life <= 0; }
}

// ------------------------------------------------------------
//  Objetos recogibles: monedas, corazones, armas, armaduras, diamante
// ------------------------------------------------------------
class Item {
  constructor(kind, cx, cy, opts = {}) {
    this.kind = kind;
    this.w = 26; this.h = 26;
    this.x = cx - 13; this.y = cy - 13;
    this.t = Math.floor(Math.random() * 100);
    this.fall = !!opts.fall;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.life = opts.life || 0;
    this.dead = false;
  }
  update(g) {
    this.t++;
    if (this.fall) {
      this.vy = Math.min(this.vy + 0.4, 10);
      moveAndCollide(this, g.level);
      this.vx *= 0.96;
      if (this.y > levelBottom(g.level) + 40) {
        if (this.kind === 'diamond' || this.kind === 'pocionVida') { this.y = 40; this.vy = 0; this.x = g.camX + VIEW_W / 2; }
        else this.dead = true;
      }
    }
    if (this.life && --this.life <= 0) this.dead = true;
  }
  bob() { return this.fall ? 0 : Math.sin(this.t * 0.08) * 3; }
}

// ------------------------------------------------------------
//  Bandera de punto de control
// ------------------------------------------------------------
class Checkpoint {
  constructor(tx, row) {
    this.x = tx * TILE + 6;
    this.w = 22; this.h = 64;
    this.y = (row + 1) * TILE - this.h;
    this.active = false;
    this.t = 0;
  }
}

// ------------------------------------------------------------
//  Plataformas móviles (tablas, ascensores o... ¡dragones amigos!)
// ------------------------------------------------------------
class MovingPlatform {
  constructor(x1, y1, x2, y2, wTiles, speed, style) {
    this.ax = x1; this.ay = y1; this.bx = x2; this.by = y2;
    this.x = x1; this.y = y1;
    this.w = wTiles * TILE; this.h = 16;
    this.speed = speed || 0.015;
    this.style = style || 'plank';
    this.t = 0; this.dx = 0; this.dy = 0;
    this.solid = true;
    // El dragón amigo funciona como una barca: espera a que subas
    this.ferry = this.style === 'dragon';
    this.k = 0; this.wait = 0;
  }
  update(g) {
    let k;
    if (this.ferry) {
      const riding = g && g.player.riding === this;
      if (riding) { this.wait = 120; this.k = Math.min(1, this.k + this.speed * 0.35); }
      else if (this.wait > 0) this.wait--;
      else this.k = Math.max(0, this.k - this.speed * 0.35);
      k = 0.5 - 0.5 * Math.cos(this.k * Math.PI);
    } else {
      this.t += this.speed;
      k = 0.5 - 0.5 * Math.cos(this.t);
    }
    const nx = this.ax + (this.bx - this.ax) * k;
    const ny = this.ay + (this.by - this.ay) * k;
    this.dx = nx - this.x; this.dy = ny - this.y;
    this.x = nx; this.y = ny;
  }
}

class FallingPlatform {
  constructor(x, y, wTiles) {
    this.hx = x; this.hy = y;
    this.x = x; this.y = y;
    this.w = wTiles * TILE; this.h = 16;
    this.style = 'falling';
    this.state = 'idle'; this.timer = 0; this.vy = 0;
    this.dx = 0; this.dy = 0;
    this.solid = true;
  }
  onStand() { if (this.state === 'idle') { this.state = 'shake'; this.timer = 36; } }
  update(g) {
    this.dx = 0; this.dy = 0;
    if (this.state === 'shake') {
      if (--this.timer <= 0) { this.state = 'fall'; this.vy = 0; }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 0.35, 9);
      this.y += this.vy; this.dy = this.vy;
      if (this.y > levelBottom(g.level) + 60) { this.state = 'gone'; this.timer = 200; this.solid = false; }
    } else if (this.state === 'gone') {
      if (--this.timer <= 0) { this.state = 'idle'; this.x = this.hx; this.y = this.hy; this.solid = true; }
    }
  }
}

// ------------------------------------------------------------
//  Chorros de fuego / vapor que salen del suelo
// ------------------------------------------------------------
class FireJet {
  constructor(tx, surfaceRow, theme, phase = 0) {
    this.x = tx * TILE + 4; this.w = 24;
    this.baseY = surfaceRow * TILE;
    this.maxH = 3 * TILE;
    this.style = theme === 'city' || theme === 'ice' || theme === 'beach' ? 'steam' : 'fire';
    this.t = phase;
    this.state = 'off';
    this.flameH = 0;
  }
  update(g) {
    this.t = (this.t + 1) % 210;
    this.state = this.t < 120 ? 'off' : this.t < 150 ? 'warn' : 'on';
    this.flameH = this.state === 'on' ? this.maxH * Math.min(1, (this.t - 150) / 8) : 0;
    if (this.state === 'on') {
      const box = { x: this.x + 2, y: this.baseY - this.flameH, w: this.w - 4, h: this.flameH };
      const p = g.player;
      if (overlap(p, box)) p.hurt(g, 1, this.style === 'fire' ? 'fire' : null, this.x + this.w / 2);
      if (this.t % 6 === 0) g.particles.push(new Particle(this.x + this.w / 2 + (Math.random() - 0.5) * 16, this.baseY - this.flameH, (Math.random() - 0.5), -1.5, this.style === 'fire' ? '#ffcf48' : '#ffffff', 22, 5, -0.02));
    }
  }
}

// ------------------------------------------------------------
//  Bloque aplastador (castillo)
// ------------------------------------------------------------
class Crusher {
  constructor(tx, ty, level) {
    this.x = tx * TILE; this.y = ty * TILE;
    this.w = 2 * TILE; this.h = 60;
    this.homeY = this.y;
    let row = ty + 2;
    while (row < (level.rows || ROWS) && !isSolid(tileAt(level, tx, row))) row++;
    this.floorY = row * TILE - this.h;
    this.state = 'wait'; this.timer = 0; this.vy = 0;
  }
  update(g) {
    const p = g.player;
    const pcx = p.x + p.w / 2;
    switch (this.state) {
      case 'wait':
        if (this.timer > 0) this.timer--;
        else if (pcx > this.x - 16 && pcx < this.x + this.w + 16 && p.y > this.y) { this.state = 'warn'; this.timer = 22; }
        break;
      case 'warn':
        if (--this.timer <= 0) { this.state = 'fall'; this.vy = 0; }
        break;
      case 'fall':
        this.vy = Math.min(this.vy + 0.9, 14);
        this.y += this.vy;
        if (this.y >= this.floorY) {
          this.y = this.floorY; this.state = 'down'; this.timer = 50;
          if (Math.abs(this.x - g.camX - VIEW_W / 2) < VIEW_W) { g.shake = Math.max(g.shake, 7); Sound.play('thud'); }
        }
        if (overlap(p, this)) p.hurt(g, 1, null, this.x + this.w / 2);
        break;
      case 'down':
        if (--this.timer <= 0) this.state = 'rise';
        break;
      case 'rise':
        this.y -= 1.6;
        if (this.y <= this.homeY) { this.y = this.homeY; this.state = 'wait'; this.timer = 50; }
        break;
    }
  }
}

// ------------------------------------------------------------
//  Dragón amigo: te sigue y lanza fuego a los enemigos
// ------------------------------------------------------------
class FriendDragon {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 40; this.h = 32;
    this.homeY = y;
    this.state = 'idle';
    this.t = 0; this.cool = 60; this.facing = -1;
  }
  update(g) {
    this.t++;
    const p = g.player;
    if (this.state === 'idle') {
      this.y = this.homeY + Math.sin(this.t * 0.06) * 6;
      if (overlap(p, { x: this.x - 20, y: this.y - 20, w: this.w + 40, h: this.h + 40 })) {
        this.state = 'follow';
        Sound.play('power');
        g.say('¡Un dragón amigo!', 'Te seguirá y lanzará fuego a los enemigos');
      }
      return;
    }
    const tx = p.x + p.w / 2 - p.facing * 46 - this.w / 2;
    const ty = p.y - 46 + Math.sin(this.t * 0.08) * 6;
    this.x += (tx - this.x) * 0.07;
    this.y += (ty - this.y) * 0.07;
    this.facing = p.facing;
    if (--this.cool <= 0) {
      const target = g.nearestTarget(this.x + this.w / 2, this.y + this.h / 2, 340);
      if (target) {
        const dx = target.x - (this.x + this.w / 2), dy = target.y - (this.y + this.h / 2);
        const d = Math.hypot(dx, dy) || 1;
        this.facing = dx >= 0 ? 1 : -1;
        g.projectiles.push(new Projectile('friendFire', this.x + this.w / 2 + this.facing * 18, this.y + 12, dx / d * 6, dy / d * 6, 'friend', 1, { life: 120 }));
        Sound.play('fire');
        this.cool = 95;
      } else this.cool = 20;
    }
  }
}

// ------------------------------------------------------------
//  Portal que abre el diamante
// ------------------------------------------------------------
class Portal {
  constructor(cx, groundY) {
    this.cx = cx; this.groundY = groundY;
    this.w = 64; this.h = 96;
    this.t = 0;
  }
  update() { this.t++; }
  box() {
    const s = Math.min(1, this.t / 40);
    return { x: this.cx - 22 * s, y: this.groundY - this.h * s, w: 44 * s, h: this.h * s };
  }
}

// ------------------------------------------------------------
//  Trampolín, seta saltarina o géiser: te lanzan muy alto
//  style: 'trampoline' | 'mushroom' | 'geyser' (el géiser sale a ratos)
// ------------------------------------------------------------
class Spring {
  constructor(tx, row, style = 'trampoline', phase = 0) {
    this.x = tx * TILE + 2; this.w = TILE - 4;
    this.baseY = (row + 1) * TILE; // superficie en la que se apoya
    this.h = 18; this.y = this.baseY - this.h;
    this.style = style;
    this.t = phase;
    this.squash = 0; this.cool = 0;
  }
  get active() { return this.style !== 'geyser' || this.t % 200 >= 120; }
  get warn() { return this.style === 'geyser' && this.t % 200 >= 85 && this.t % 200 < 120; }
  update(g) {
    this.t++;
    if (this.squash > 0) this.squash--;
    if (this.cool > 0) this.cool--;
    if (!this.active) return;
    const zone = this.style === 'geyser'
      ? { x: this.x, y: this.baseY - 5 * TILE, w: this.w, h: 5 * TILE }
      : { x: this.x, y: this.y, w: this.w, h: this.h };
    const p = g.player;
    const feet = { x: p.x + 4, y: p.y + p.h - 10, w: p.w - 8, h: 12 };
    if (this.cool === 0 && p.vy >= 0 && !p.dead && overlap(feet, zone)) {
      p.vy = Input.down('jump') ? -19.5 : -18;
      p.bounced = true; p.jumpsLeft = 1; p.onGround = false; p.riding = null; p.coyote = 0;
      this.squash = 12; this.cool = 10;
      Sound.play('spring');
      if (this.style === 'geyser') g.puff(p.x + p.w / 2, p.y + p.h, '#e6f8ff', 10);
    }
  }
}

// ------------------------------------------------------------
//  Cosas que caen cuando pasas debajo:
//  carámbanos, cocos, rocas y meteoritos (vuelven a salir)
// ------------------------------------------------------------
class Dropper {
  constructor(tx, ty, style) {
    this.style = style; // 'icicle' | 'coconut' | 'rock' | 'meteor'
    this.w = style === 'icicle' ? 16 : 24; this.h = style === 'icicle' ? 30 : 24;
    this.hx = tx * TILE + TILE / 2 - this.w / 2; this.hy = ty * TILE;
    this.x = this.hx; this.y = this.hy;
    this.state = 'idle'; this.timer = 0; this.vy = 0; this.t = 0;
    this.floorY = null;
  }
  update(g) {
    this.t++;
    const L = g.level, p = g.player, cx = this.x + this.w / 2;
    if (this.floorY == null) {
      let row = Math.floor((this.hy + this.h) / TILE);
      while (row < (L.rows || ROWS) && !isSolid(tileAt(L, Math.floor(cx / TILE), row)) && tileAt(L, Math.floor(cx / TILE), row) !== T.LIQUID) row++;
      this.floorY = row * TILE;
    }
    switch (this.state) {
      case 'idle':
        if (Math.abs(p.x + p.w / 2 - cx) < 70 && p.y > this.y) { this.state = 'warn'; this.timer = 28; }
        break;
      case 'warn':
        if (--this.timer <= 0) { this.state = 'fall'; this.vy = 0; }
        break;
      case 'fall': {
        this.vy = Math.min(this.vy + 0.5, 11);
        this.y += this.vy;
        if (this.style === 'meteor' && this.t % 2 === 0) g.particles.push(new Particle(cx + (Math.random() - 0.5) * 10, this.y, (Math.random() - 0.5), -1, Math.random() < 0.5 ? '#ffb02e' : '#ff5a1f', 18, 5, -0.03));
        if (overlap({ x: p.x + 3, y: p.y + 4, w: p.w - 6, h: p.h - 4 }, this)) p.hurt(g, 1, this.style === 'icicle' ? 'ice' : null, cx);
        if (this.y + this.h >= this.floorY) {
          this.state = 'gone'; this.timer = 150;
          const col = { icicle: '#e6f8ff', coconut: '#8a5a2b', rock: '#6b5650', meteor: '#ffb02e' }[this.style];
          g.sparks(cx, this.floorY - 4, col, 12);
          if (Math.abs(cx - g.camX - VIEW_W / 2) < VIEW_W) Sound.play(this.style === 'icicle' ? 'ice' : 'thud');
          if (this.style === 'meteor' || this.style === 'rock') g.shake = Math.max(g.shake, 4);
        }
        break;
      }
      case 'gone':
        if (--this.timer <= 0) { this.state = 'idle'; this.x = this.hx; this.y = this.hy; this.vy = 0; }
        break;
    }
  }
}

// ------------------------------------------------------------
//  Barra de bolas de fuego que gira alrededor de un bloque
// ------------------------------------------------------------
class FireBar {
  constructor(tx, ty, len, speed) {
    this.cx = tx * TILE + TILE / 2; this.cy = ty * TILE + TILE / 2;
    this.len = len; this.speed = speed;
    this.a = 0;
  }
  balls() {
    const out = [];
    for (let i = 1; i <= this.len; i++) out.push({ x: this.cx + Math.cos(this.a) * i * 16, y: this.cy + Math.sin(this.a) * i * 16 });
    return out;
  }
  update(g) {
    this.a += this.speed;
    const p = g.player, hb = { x: p.x + 4, y: p.y + 6, w: p.w - 8, h: p.h - 8 };
    for (const b of this.balls()) {
      const nx = clamp(b.x, hb.x, hb.x + hb.w), ny = clamp(b.y, hb.y, hb.y + hb.h);
      if ((b.x - nx) ** 2 + (b.y - ny) ** 2 < 64) { p.hurt(g, 1, null, this.cx); break; }
    }
  }
}

// ------------------------------------------------------------
//  Viento: ventisca que empuja (fx) o aire caliente que sube (fy).
//  gust > 0: sopla a rachas (frames del ciclo)
// ------------------------------------------------------------
class Wind {
  constructor(x0, y0, x1, y1, fx, fy, gust = 0) {
    this.x = x0 * TILE; this.y = y0 * TILE;
    this.w = (x1 - x0 + 1) * TILE; this.h = (y1 - y0 + 1) * TILE;
    this.fx = fx; this.fy = fy; this.gust = gust;
    this.t = 0;
  }
  get on() { return !this.gust || this.t % this.gust < this.gust * 0.55; }
  update(g) {
    this.t++;
    const p = g.player;
    if (!this.on || p.dead || !overlap(p, this)) return;
    p.push += this.fx;
    if (this.fy) { p.vy = Math.max(p.vy + this.fy, -5.5); p.jumpsLeft = 1; }
  }
}

// ------------------------------------------------------------
//  Plataforma mágica que aparece y desaparece (infierno)
// ------------------------------------------------------------
class BlinkPlatform {
  constructor(x, y, wTiles, phase = 0) {
    this.x = x; this.y = y;
    this.w = wTiles * TILE; this.h = 16;
    this.style = 'blink';
    this.t = phase % 240;
    this.dx = 0; this.dy = 0;
    this.solid = true; this.state = 'on';
  }
  update() {
    this.t = (this.t + 1) % 240;
    this.state = this.t < 130 ? 'on' : this.t < 170 ? 'warn' : 'gone';
    this.solid = this.state !== 'gone';
  }
}
