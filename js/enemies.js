'use strict';
// ============================================================
//  Enemigos: animales ayudantes de los villanos y esbirros
// ============================================================
//  ai:
//   walker       -> patrulla y se da la vuelta en bordes/paredes
//   pouncer      -> patrulla y salta sobre el ninja (tigre, león)
//   charger      -> avisa temblando y embiste (guepardo, rinoceronte)
//   flyer        -> vuela en ondas y baja en picado (murciélago)
//   mosquito     -> persigue despacio. ¡Su picadura te elimina!
//   dangler      -> cuelga de un hilo y baja de golpe (araña)
//   shooterFlyer -> vuela y escupe bolas de fuego (dragoncito)
//   hopper       -> va dando saltitos hacia el ninja (monstruito de fuego)
//  weak: elemento que le hace doble daño ('fire' | 'ice')
const ENEMY_TYPES = {
  lobo:        { name: 'Lobo',        w: 42, h: 30, hp: 2, speed: 1.5, ai: 'walker' },
  tigre:       { name: 'Tigre',       w: 48, h: 32, hp: 3, speed: 1.5, ai: 'pouncer' },
  leon:        { name: 'León',        w: 50, h: 36, hp: 3, speed: 1.3, ai: 'pouncer' },
  guepardo:    { name: 'Guepardo',    w: 46, h: 28, hp: 2, speed: 1.1, ai: 'charger', dash: 6.4 },
  rinoceronte: { name: 'Rinoceronte', w: 60, h: 40, hp: 4, speed: 0.8, ai: 'charger', dash: 5 },
  hipopotamo:  { name: 'Hipopótamo',  w: 60, h: 42, hp: 4, speed: 0.7, ai: 'walker' },
  piton:       { name: 'Pitón',       w: 60, h: 18, hp: 2, speed: 0.9, ai: 'walker' },
  arana:       { name: 'Araña gigante', w: 44, h: 32, hp: 2, ai: 'dangler' },
  murcielago:  { name: 'Murciélago',  w: 32, h: 22, hp: 1, ai: 'flyer' },
  mosquito:    { name: 'Mosquito',    w: 18, h: 16, hp: 1, ai: 'mosquito', speed: 0.75, lethal: true },
  miniMetal:   { name: 'Mini Metal',  w: 34, h: 36, hp: 2, speed: 1.2, ai: 'walker' },
  dragoncito:  { name: 'Dragoncito',  w: 42, h: 30, hp: 2, ai: 'shooterFlyer' },
  caballerito: { name: 'Caballero',   w: 32, h: 46, hp: 3, speed: 1.1, ai: 'walker' },
  escorpion:   { name: 'Escorpión',   w: 46, h: 26, hp: 2, speed: 1.0, ai: 'charger', dash: 4.2 },
  osoPolar:    { name: 'Oso polar',   w: 58, h: 42, hp: 4, speed: 0.9, ai: 'charger', dash: 4.6, weak: 'fire' },
  monstruitoFuego: { name: 'Monstruito de fuego', w: 30, h: 30, hp: 2, ai: 'hopper', weak: 'ice', fiery: true },
  diablillo:   { name: 'Diablillo',   w: 30, h: 40, hp: 3, speed: 1.4, ai: 'pouncer', weak: 'ice', fiery: true },
};
const FLYING_AI = new Set(['flyer', 'mosquito', 'dangler', 'shooterFlyer']);

class Enemy {
  // tx, ty en casillas. Los de suelo se apoyan sobre la fila ty+1.
  constructor(kind, tx, ty, opts = {}) {
    const d = ENEMY_TYPES[kind];
    this.kind = kind; this.d = d;
    this.w = d.w; this.h = d.h;
    this.hp = d.hp;
    this.flying = FLYING_AI.has(d.ai);
    this.x = tx * TILE + TILE / 2 - this.w / 2;
    this.y = this.flying ? ty * TILE + TILE / 2 - this.h / 2 : (ty + 1) * TILE - this.h;
    this.homeX = this.x; this.homeY = this.y;
    this.vx = 0; this.vy = 0; this.kb = 0;
    this.facing = opts.facing || -1;
    this.t = Math.floor(Math.random() * 300);
    this.hurtT = 0; this.lastHit = -1;
    this.dead = false; this.onGround = false;
    this.state = 'move'; this.timer = 0; this.cool = 0; this.swoop = 0;
    this.isHelper = !!opts.helper;
    this.frozen = 0;
    if (d.ai === 'dangler') {
      this.anchorY = (opts.anchorRow || 0) * TILE;
      this.floorY = (opts.floorRow || GROUND_ROW) * TILE - this.h;
    }
    if (d.ai === 'shooterFlyer') this.cool = 60 + Math.floor(Math.random() * 90);
  }

  update(g) {
    this.t++;
    if (this.hurtT > 0) this.hurtT--;
    const p = g.player;
    const dx = (p.x + p.w / 2) - (this.x + this.w / 2);
    const dy = (p.y + p.h / 2) - (this.y + this.h / 2);
    if (this.frozen > 0) {
      // congelado: no se mueve (los de suelo caen)
      this.frozen--;
      if (!this.flying) this.fall(g, 0);
      return;
    }
    switch (this.d.ai) {
      case 'walker': this.walk(g, this.d.speed); break;
      case 'pouncer': this.pounce(g, dx, dy); break;
      case 'charger': this.charge(g, dx, dy); break;
      case 'flyer': this.fly(dx, dy); break;
      case 'mosquito': this.buzz(dx, dy); break;
      case 'dangler': this.dangle(p, dx); break;
      case 'shooterFlyer': this.shooter(g, dx, dy); break;
      case 'hopper': this.hop(g, dx, dy); break;
    }
  }

  hop(g, dx, dy) {
    if (this.onGround) {
      if (this.cool > 0) { this.cool--; this.fall(g, 0); return; }
      if (Math.abs(dx) < 400) this.facing = dx >= 0 ? 1 : -1;
      if (!groundAhead(this, g.level, this.facing)) this.facing *= -1;
      this.vy = -6.5;
      this.cool = 40 + Math.floor(Math.random() * 30);
    }
    this.fall(g, this.onGround ? 0 : this.facing * 1.8);
    if (this.hitWall) this.facing *= -1;
  }

  fall(g, vx) {
    this.vx = vx + this.kb;
    this.kb *= 0.85;
    if (Math.abs(this.kb) < 0.1) this.kb = 0;
    this.vy = Math.min(this.vy + PHYS.gravity, PHYS.maxFall);
    moveAndCollide(this, g.level);
  }

  walk(g, speed) {
    if (this.onGround && !groundAhead(this, g.level, this.facing)) this.facing *= -1;
    this.fall(g, this.facing * speed);
    if (this.hitWall) this.facing *= -1;
  }

  pounce(g, dx, dy) {
    if (this.state === 'move') {
      if (this.cool > 0) this.cool--;
      this.walk(g, this.d.speed);
      if (this.onGround && this.cool === 0 && Math.abs(dx) < 220 && Math.abs(dy) < 100) {
        this.facing = dx >= 0 ? 1 : -1;
        this.state = 'crouch'; this.timer = 30;
      }
    } else if (this.state === 'crouch') {
      this.fall(g, 0);
      if (--this.timer <= 0) { this.vy = -8.5; this.state = 'leap'; this.timer = 0; }
    } else {
      this.timer++;
      this.fall(g, this.facing * 3.6);
      if (this.onGround && this.timer > 4) { this.state = 'move'; this.cool = 110; }
    }
  }

  charge(g, dx, dy) {
    if (this.state === 'move') {
      if (this.cool > 0) this.cool--;
      if (this.cool === 0 && this.onGround && Math.abs(dx) < 300 && Math.abs(dy) < 60) {
        this.facing = dx >= 0 ? 1 : -1;
        this.state = 'warn'; this.timer = 32;
        this.fall(g, 0);
        return;
      }
      this.walk(g, this.d.speed);
    } else if (this.state === 'warn') {
      this.fall(g, 0);
      if (--this.timer <= 0) { this.state = 'dash'; this.timer = 70; }
    } else {
      this.fall(g, this.facing * this.d.dash);
      if (this.hitWall || !groundAhead(this, g.level, this.facing) || --this.timer <= 0) {
        this.state = 'move'; this.cool = 100;
      }
    }
  }

  fly(dx, dy) {
    const nx = this.homeX + Math.sin(this.t * 0.02) * 90;
    this.facing = nx >= this.x ? 1 : -1;
    this.x = nx;
    const near = Math.abs(dx) < 170 && dy > 0;
    this.swoop += ((near ? Math.min(dy, 120) : 0) - this.swoop) * 0.03;
    this.y = this.homeY + Math.sin(this.t * 0.08) * 20 + this.swoop;
  }

  buzz(dx, dy) {
    const d = Math.hypot(dx, dy) || 1;
    let ax, ay;
    if (d < 260) { ax = dx / d; ay = dy / d; }
    else { ax = clamp((this.homeX - this.x) / 100, -1, 1); ay = clamp((this.homeY - this.y) / 100, -1, 1); }
    this.vx += ax * 0.05; this.vy += ay * 0.05;
    const sp = Math.hypot(this.vx, this.vy), max = this.d.speed;
    if (sp > max) { this.vx *= max / sp; this.vy *= max / sp; }
    this.x += this.vx;
    this.y += this.vy + Math.sin(this.t * 0.4) * 0.5;
    if (Math.abs(this.vx) > 0.05) this.facing = this.vx > 0 ? 1 : -1;
  }

  dangle(p, dx) {
    this.facing = dx >= 0 ? 1 : -1;
    switch (this.state) {
      case 'move':
        this.y = this.homeY + Math.sin(this.t * 0.05) * 4;
        if (Math.abs(dx) < 90 && p.y > this.y) this.state = 'drop';
        break;
      case 'drop':
        this.y += 4;
        if (this.y >= this.floorY) { this.y = this.floorY; this.state = 'wait'; this.timer = 70; }
        break;
      case 'wait':
        if (--this.timer <= 0) this.state = 'up';
        break;
      case 'up':
        this.y -= 1.4;
        if (this.y <= this.homeY) { this.y = this.homeY; this.state = 'rest'; this.timer = 90; }
        break;
      default:
        this.y = this.homeY + Math.sin(this.t * 0.05) * 4;
        if (--this.timer <= 0) this.state = 'move';
    }
  }

  shooter(g, dx, dy) {
    this.x = this.homeX + Math.sin(this.t * 0.015) * 100;
    this.y = this.homeY + Math.sin(this.t * 0.05) * 18;
    this.facing = dx >= 0 ? 1 : -1;
    if (--this.cool <= 0) {
      this.cool = 170;
      if (g.onScreen(this) && Math.abs(dx) < 440) {
        const d = Math.hypot(dx, dy) || 1;
        g.projectiles.push(new Projectile('fire', this.x + this.w / 2 + this.facing * 16, this.y + this.h / 2 - 4,
          dx / d * 3, dy / d * 3, 'enemy', 1, { element: 'fire' }));
        Sound.play('fire');
      }
    }
  }

  hurt(g, dmg, srcX) {
    if (this.dead) return;
    this.hp -= dmg;
    this.hurtT = 14;
    this.kb = (this.x + this.w / 2 < srcX ? -1 : 1) * 4;
    if (this.hp <= 0) this.kill(g);
    else Sound.play('hit');
  }

  kill(g) {
    if (this.dead) return;
    this.dead = true;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    g.puff(cx, cy, '#ffffff', 14);
    g.addScore(100, cx, this.y);
    Sound.play('pop');
    const r = Math.random();
    if (r < 0.15) g.dropItem('heart', cx, cy);
    else if (r < 0.6) g.dropItem('coin', cx, cy);
  }
}
