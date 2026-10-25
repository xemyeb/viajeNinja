'use strict';
// ============================================================
//  Juego: estados, bucle de actualización, colisiones y dibujo
// ============================================================
const SAVE_KEY = 'viajeNinja.save';

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    return s && typeof s.world === 'number' && s.inv ? s : null;
  } catch (e) { return null; }
}
function writeSave(data) {
  try { if (data) localStorage.setItem(SAVE_KEY, JSON.stringify(data)); else localStorage.removeItem(SAVE_KEY); } catch (e) { /* sin almacenamiento */ }
}
function cloneInv(inv) { return JSON.parse(JSON.stringify(inv)); }
function freshInv() { return { weapons: ['baston'], weapon: 'baston', armors: [], armor: null }; }

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.frame = 0;
    this.timer = 0;
    this.shake = 0;
    this.msg = null;
    this.level = null;
    this.save = loadSave();
    this.inv = freshInv();
    this.lives = START_LIVES;
    this.score = 0;
    this.coins = 0;
    this.particles = [];
    this.camX = 0; this.camY = 0;
    this.state = 'title';
    Sound.playMusic('title');
  }

  // ----------------------------------------------------------
  //  Partidas y mundos
  // ----------------------------------------------------------
  newGame() {
    this.inv = freshInv();
    this.lives = START_LIVES; this.score = 0; this.coins = 0;
    this.loadWorld(0);
  }

  continueGame() {
    this.inv = cloneInv(this.save.inv);
    this.lives = START_LIVES; this.score = this.save.score || 0; this.coins = 0;
    const w = clamp(this.save.world, 0, WORLDS.length - 1);
    this.loadWorld(w, WORLDS[w].build2 ? this.save.part || 0 : 0);
  }

  // part = 1: segunda parte del mundo (en el infierno, tras el descenso).
  // direct: entra jugando, sin la pantalla de presentación.
  loadWorld(i, part = 0, direct = false) {
    this.worldIndex = i;
    this.world = WORLDS[i];
    this.part = part;
    this.level = (part && this.world.build2 ? this.world.build2 : this.world.build)();
    this.startInv = cloneInv(this.inv);
    this.startScore = this.score;
    this.startCoins = this.coins;
    this.enemies = []; this.items = []; this.checkpoints = []; this.platforms = [];
    this.jets = []; this.crushers = []; this.friends = []; this.projectiles = []; this.particles = [];
    this.springs = []; this.droppers = []; this.firebars = []; this.winds = [];
    this.portal = null; this.boss = null; this.bossSpawn = null;
    this.rushIndex = 0; this.rushWait = 0;
    this.arenaActive = false; this.bossDone = false; this.bossHpSaved = null;
    this.hasDiamond = false;
    this.msg = null;

    const L = this.level;
    for (const s of L.spawns) {
      switch (s.type) {
        case 'item': {
          const [type, id] = s.kind.split(':');
          if (type === 'weapon' && this.inv.weapons.includes(id)) break;
          if (type === 'armor' && this.inv.armors.includes(id)) break;
          this.items.push(new Item(s.kind, s.x * TILE + TILE / 2, s.y * TILE + TILE / 2));
          break;
        }
        case 'enemy': this.enemies.push(new Enemy(s.kind, s.x, s.y, s.opts)); break;
        case 'checkpoint': this.checkpoints.push(new Checkpoint(s.x, s.y)); break;
        case 'moving': this.platforms.push(new MovingPlatform(s.x1 * TILE, s.y1 * TILE, s.x2 * TILE, s.y2 * TILE, s.w, s.speed, s.style)); break;
        case 'falling': this.platforms.push(new FallingPlatform(s.x * TILE, s.y * TILE, s.w)); break;
        case 'jet': this.jets.push(new FireJet(s.x, s.row, L.theme, s.phase)); break;
        case 'crusher': this.crushers.push(new Crusher(s.x, s.y, L)); break;
        case 'friend': this.friends.push(new FriendDragon(s.x * TILE, s.y * TILE)); break;
        case 'spring': this.springs.push(new Spring(s.x, s.row, s.style, s.phase)); break;
        case 'dropper': this.droppers.push(new Dropper(s.x, s.y, s.style)); break;
        case 'firebar': this.firebars.push(new FireBar(s.x, s.y, s.len, s.speed)); break;
        case 'wind': this.winds.push(new Wind(s.x0, s.y0, s.x1, s.y1, s.fx, s.fy, s.gust)); break;
        case 'blink': this.platforms.push(new BlinkPlatform(s.x * TILE, s.y * TILE, s.w, s.phase)); break;
        case 'boss': this.bossSpawn = s; break;
      }
    }

    this.respawn = { x: L.start.x * TILE, y: (L.start.y + 1) * TILE - 46 };
    this.lastSafe = { ...this.respawn };
    this.player = new Player(this.respawn.x, this.respawn.y, this.inv);
    this.player.onGround = true;
    this.snapCamera();
    this.state = direct ? 'playing' : 'intro';
    this.timer = 0;
    Sound.playMusic(this.world.song);
  }

  // Al cruzar la puerta del final del descenso empieza la segunda parte
  enterPart2() {
    const p = this.player;
    this.puff(p.x + p.w / 2, p.y + p.h / 2, '#ff6a1a', 20);
    this.loadWorld(this.worldIndex, 1, true);
    Sound.play('portal');
    this.save = { world: this.worldIndex, part: 1, inv: cloneInv(this.inv), score: this.score };
    writeSave(this.save);
    this.say('¡Has llegado al infierno!', 'Busca la poción que salvará a papá');
  }

  restartWorld() {
    this.inv = cloneInv(this.startInv);
    this.lives = START_LIVES;
    this.score = this.startScore;
    this.coins = this.startCoins;
    this.loadWorld(this.worldIndex, this.part);
  }

  // ----------------------------------------------------------
  //  Bucle principal
  // ----------------------------------------------------------
  update() {
    this.frame++;
    this.timer++;
    if (Input.pressed('mute')) Sound.toggleMute();
    if (this.msg && --this.msg.t <= 0) this.msg = null;

    switch (this.state) {
      case 'title':
        if (Input.pressed('newgame')) this.newGame();
        else if (Input.pressed('start') || Input.pressed('jump')) this.save ? this.continueGame() : this.newGame();
        break;
      case 'intro':
        this.updateParticles();
        if (this.timer > 240 || (this.timer > 30 && (Input.pressed('start') || Input.pressed('jump') || Input.pressed('attack')))) {
          this.state = 'playing';
          this.say(this.world.name, '¡Adelante, ninja!');
        }
        break;
      case 'paused':
        if (Input.pressed('pause') || Input.pressed('start')) this.state = 'playing';
        break;
      case 'playing':
        if (Input.pressed('pause')) { this.state = 'paused'; break; }
        this.updatePlay();
        break;
      case 'dying': this.updateDying(); break;
      case 'levelclear':
        this.updateParticles();
        if (this.portal) this.portal.update();
        if (this.timer % 12 === 0) this.firework(this.camX + 100 + Math.random() * (VIEW_W - 200), 60 + Math.random() * 200);
        if (this.timer > 260) {
          if (this.world.ending) this.startEnding(this.world.ending);
          else this.loadWorld(this.worldIndex + 1);
        }
        break;
      case 'gameover':
        if (this.timer > 60 && (Input.pressed('start') || Input.pressed('jump'))) this.restartWorld();
        break;
      case 'ending': this.updateEnding(); break;
    }

    if (this.shake > 0) { this.shake *= 0.85; if (this.shake < 0.5) this.shake = 0; }
  }

  updatePlay() {
    const p = this.player;
    const L = this.level;

    // plataformas móviles (llevan al ninja encima)
    for (const pl of this.platforms) pl.update(this);
    if (p.riding && p.riding.solid) { p.x += p.riding.dx; p.y += p.riding.dy; }
    for (const w of this.winds) w.update(this); // el viento empuja antes de moverse

    p.update(this);
    this.platformCollide(p);
    if (p.onGround) p.bossStomped = false;
    this.tileHazards(p);
    if (this.state !== 'playing') return;

    // posición segura para volver si caes a un agujero
    if (p.onGround && !p.riding && p.invuln === 0 && this.frame % 20 === 0) {
      const row = Math.floor((p.y + p.h + 2) / TILE);
      const l = tileAt(L, Math.floor((p.x - 8) / TILE), row), r = tileAt(L, Math.floor((p.x + p.w + 8) / TILE), row);
      if (isSolid(l) && isSolid(r)) this.lastSafe = { x: p.x, y: p.y };
    }

    // puntos de control
    for (const c of this.checkpoints) {
      c.t++;
      if (!c.active && overlap(p, c)) {
        c.active = true;
        this.respawn = { x: c.x, y: c.y + c.h - p.h };
        this.lastSafe = { ...this.respawn };
        p.hearts = START_HEARTS;
        Sound.play('checkpoint');
        this.floatText(c.x + 12, c.y - 10, '¡Punto de control!', '#7dff9a');
      }
    }

    for (const j of this.jets) j.update(this);
    for (const c of this.crushers) c.update(this);
    for (const f of this.friends) f.update(this);
    for (const s of this.springs) s.update(this);
    for (const d of this.droppers) d.update(this);
    for (const fb of this.firebars) fb.update(this);
    if (this.state !== 'playing') return;

    // puerta al final del descenso
    if (L.exit && overlap(p, L.exit)) { this.enterPart2(); return; }

    const phb = { x: p.x + 3, y: p.y + 4, w: p.w - 6, h: p.h - 4 };
    const mb = p.meleeBox();
    const W = WEAPONS[p.inv.weapon];
    if (mb && W.element) {
      for (let i = 0; i < 2; i++) {
        this.particles.push(new Particle(mb.x + Math.random() * mb.w, mb.y + Math.random() * mb.h, 0, -0.6,
          W.element === 'fire' ? (Math.random() < 0.5 ? '#ffb02e' : '#ff5a1f') : (Math.random() < 0.5 ? '#bdefff' : '#ffffff'), 18, 4, W.element === 'fire' ? -0.03 : 0.05));
      }
    }

    // ---- enemigos ----
    for (const e of this.enemies) {
      if (e.dead || !this.isActive(e)) continue;
      e.update(this);
      if (e.y > levelBottom(L) + 60) { e.dead = true; continue; }
      if (mb && e.lastHit !== p.attackId && overlap(mb, e)) {
        e.lastHit = p.attackId;
        this.weaponHit(e, W, p.x + p.w / 2);
      }
      if (e.dead) continue;
      const box = e.d.lethal ? { x: e.x + 3, y: e.y + 3, w: e.w - 6, h: e.h - 6 } : e;
      if (overlap(phb, box)) {
        const stomp = p.vy > 0.5 && p.prevBottom <= e.y + Math.min(16, e.h * 0.6);
        if (stomp) {
          e.kill(this);
          this.bounce(p);
          Sound.play('stomp');
        } else if (e.frozen > 0) {
          // los enemigos congelados no hacen daño
        } else if (e.d.lethal) {
          if (p.invuln === 0 && this.inv.pocion) {
            // la poción salva de una picadura y se gasta
            this.inv.pocion = false;
            e.kill(this);
            p.invuln = 90;
            Sound.play('power');
            this.sparks(p.x + p.w / 2, p.y + 10, '#3ddc84', 24);
            this.floatText(p.x + p.w / 2, p.y - 10, '¡La poción te ha salvado!', '#3ddc84');
          } else if (p.invuln === 0) {
            this.floatText(p.x + p.w / 2, p.y - 10, '¡Picadura!', '#ff5a5a');
            this.playerDie();
            return;
          }
        } else p.hurt(this, 1, null, e.x + e.w / 2);
      }
      if (this.state !== 'playing') return;
    }
    this.enemies = this.enemies.filter(e => !e.dead);

    // ---- arena del jefe (en el infierno salen los 6 jefes, uno tras otro) ----
    if (this.rushWait > 0 && --this.rushWait === 0) this.startBoss();
    if (!this.arenaActive && !this.bossDone && L.arenaStart != null && p.x > (L.arenaStart + 2) * TILE) this.startBoss();

    // ---- jefe ----
    const b = this.boss;
    if (b) {
      b.update(this);
      if (b.dead) this.boss = null;
      else if (!b.dying && b.state !== 'intro' && !b.ghost) {
        const hb = b.hitbox();
        if (mb && b.lastHit !== p.attackId && overlap(mb, hb)) {
          b.lastHit = p.attackId;
          const weak = W.element && b.d.weak === W.element;
          if (b.hurt(this, W.dmg * (weak ? 2 : 1))) {
            this.sparks(p.x + p.w / 2 + p.facing * 30, p.y + 20, weak ? '#ffe14d' : '#ffffff', weak ? 14 : 8);
            if (weak) this.floatText(b.cx, b.y - 10, '¡Súper golpe!', '#ffe14d');
          }
        }
        if (overlap(phb, hb)) {
          const stomp = p.vy > 0.5 && p.prevBottom <= hb.y + 18;
          if (stomp) {
            // solo el primer pisotón hace daño: hay que volver a tocar el suelo
            if (!p.bossStomped) {
              if (b.hurt(this, 2)) p.bossStomped = true;
              Sound.play('stomp');
            } else {
              Sound.play('clank');
              if (!p.stompHint) { p.stompHint = true; this.floatText(p.x + p.w / 2, p.y - 12, '¡Toca el suelo y vuelve a saltar!', '#ffffff'); }
            }
            this.bounce(p);
            p.vy = -11;
          } else if (!b.harmless()) this.bossHurtPlayer(1, b.kind === 'llamarada' ? 'fire' : null, b.cx);
        }
        const ab = b.attackBox();
        if (ab && overlap(phb, ab)) this.bossHurtPlayer(1, null, b.cx);
      }
      if (this.state !== 'playing') return;
    }

    // ---- proyectiles ----
    for (const pr of this.projectiles) {
      pr.update(this);
      if (pr.dead || pr.kind === 'diamond') continue;
      const cx = pr.x + pr.w / 2;
      if (pr.owner === 'enemy') {
        if (pr.kind === 'scrapIn' && this.boss && overlap(pr, this.boss.hitbox())) {
          pr.dead = true;
          if (!this.boss.dying) {
            this.boss.heal(1);
            this.floatText(this.boss.cx, this.boss.y - 10, '+1', '#a7b1bb');
            Sound.play('clank');
          }
          continue;
        }
        const wave = UNBREAKABLE.has(pr.kind);
        if (!wave && mb && overlap(mb, pr)) {
          pr.dead = true;
          this.sparks(cx, pr.y + pr.h / 2, '#ffffff', 6);
          Sound.play('clank');
          continue;
        }
        if (overlap(phb, pr) && p.invuln === 0) {
          if (this.boss) this.bossHurtPlayer(pr.dmg, pr.element, cx);
          else p.hurt(this, pr.dmg, pr.element, cx);
          if (!wave) pr.dead = true;
        }
      } else {
        for (const e of this.enemies) {
          if (!e.dead && this.isActive(e) && overlap(pr, e)) {
            if (pr.element) this.weaponHit(e, { dmg: pr.dmg, element: pr.element, freeze: pr.freeze }, cx - pr.vx);
            else e.hurt(this, pr.dmg, cx - pr.vx);
            pr.dead = true;
            break;
          }
        }
        if (!pr.dead && this.boss && !this.boss.dying && !this.boss.ghost && overlap(pr, this.boss.hitbox())) {
          const weak = pr.element && this.boss.d.weak === pr.element;
          if (this.boss.hurt(this, pr.dmg * (weak ? 2 : 1)) || this.boss.state === 'intro') pr.dead = true;
          if (weak && pr.dead) this.floatText(this.boss.cx, this.boss.y - 10, '¡Súper golpe!', '#ffe14d');
          if (pr.dead) this.sparks(cx, pr.y, '#ffffff', 6);
        }
        if (!pr.dead) {
          for (const o of this.projectiles) {
            if (o.owner === 'enemy' && !o.dead && !UNBREAKABLE.has(o.kind) && overlap(pr, o)) {
              o.dead = true; pr.dead = true;
              this.sparks(cx, pr.y, '#ffffff', 6);
              break;
            }
          }
        }
      }
      if (this.state !== 'playing') return;
    }
    this.projectiles = this.projectiles.filter(pr => !pr.dead);
    this.enemies = this.enemies.filter(e => !e.dead);

    // ---- objetos ----
    for (const it of this.items) {
      it.update(this);
      if (!it.dead && overlap(phb, it)) { it.dead = true; this.collect(it); }
    }
    this.items = this.items.filter(it => !it.dead);

    // ---- portal ----
    if (this.portal) {
      this.portal.update();
      if (this.portal.t > 40 && overlap(phb, this.portal.box())) this.levelClear();
    }

    this.updateParticles();
    this.updateCamera();
  }

  isActive(e) {
    return e.x + e.w > this.camX - 160 && e.x < this.camX + VIEW_W + 160 && e.y + e.h > this.camY - 220 && e.y < this.camY + VIEW_H + 220;
  }
  onScreen(e) {
    return e.x + e.w > this.camX - 20 && e.x < this.camX + VIEW_W + 20 && e.y + e.h > this.camY - 60 && e.y < this.camY + VIEW_H + 60;
  }

  bounce(p) {
    p.vy = Input.down('jump') ? -11.5 : -8.5;
    p.bounced = true;
    p.jumpsLeft = 1;
    p.onGround = false;
  }

  platformCollide(p) {
    p.riding = null;
    if (p.dropTimer > 0 || p.vy < 0) return;
    for (const pl of this.platforms) {
      if (!pl.solid) continue;
      if (p.x + p.w > pl.x + 2 && p.x < pl.x + pl.w - 2 && p.prevBottom <= pl.y + 8 && p.y + p.h >= pl.y) {
        p.y = pl.y - p.h;
        p.vy = 0;
        p.onGround = true;
        p.riding = pl;
        if (pl.onStand) pl.onStand();
        break;
      }
    }
  }

  tileHazards(p) {
    const L = this.level;
    const c0 = Math.floor((p.x + 4) / TILE), c1 = Math.floor((p.x + p.w - 4) / TILE);
    const r0 = Math.floor((p.y + 8) / TILE), r1 = Math.floor((p.y + p.h - 1) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = tileAt(L, c, r);
        if (t === T.SPIKES && p.y + p.h > r * TILE + 14) {
          p.hurt(this, 1, null, p.x + p.w / 2 - p.facing * 4);
          if (this.state !== 'playing') return;
          p.vy = -9; p.bounced = true;
          return;
        }
        if (t === T.LIQUID && p.y + p.h > r * TILE + 12 && !p.lavaWalk) { this.fallOut(); return; }
      }
    }
    if (p.y > levelBottom(L) + 10) this.fallOut();
    // caminando sobre la lava con el escudo
    if (p.lavaWalk && p.onGround && tileAt(L, Math.floor((p.x + p.w / 2) / TILE), Math.floor((p.y + p.h + 2) / TILE)) === T.LIQUID && this.frame % 5 === 0) {
      this.particles.push(new Particle(p.x + Math.random() * p.w, p.y + p.h, (Math.random() - 0.5), -1.2, '#ffd166', 18, 3, 0));
    }
  }

  // Caer a un agujero o al agua/lava: pierdes un corazón y vuelves atrás
  fallOut() {
    const p = this.player;
    p.hearts--;
    p.shield = Math.max(0, p.shield);
    if (p.hearts <= 0) { this.playerDie(); return; }
    Sound.play('hurt');
    p.x = this.lastSafe.x; p.y = this.lastSafe.y;
    p.vx = 0; p.vy = 0; p.riding = null;
    p.invuln = INVULN_FRAMES;
    this.puff(p.x + p.w / 2, p.y + p.h / 2, '#ffffff', 12);
    this.floatText(p.x + p.w / 2, p.y - 10, '¡Uy!', '#ffffff');
  }

  playerDie() {
    if (this.state !== 'playing') return;
    const p = this.player;
    p.dead = true;
    p.hearts = 0;
    p.vy = -10; p.vx = 0;
    this.state = 'dying';
    this.timer = 0;
    Sound.stopMusic();
    Sound.play('die');
  }

  updateDying() {
    const p = this.player;
    this.updateParticles();
    if (this.timer > 30) { p.vy = Math.min(p.vy + 0.5, 12); p.y += p.vy; }
    if (this.timer > 130) {
      this.lives--;
      if (this.lives <= 0) {
        this.state = 'gameover';
        this.timer = 0;
        return;
      }
      p.reset(this.respawn.x, this.respawn.y);
      this.lastSafe = { ...this.respawn };
      this.projectiles = [];
      if (this.arenaActive && !this.bossDone) {
        // el jefe espera, pero conserva el daño que le hiciste
        this.bossHpSaved = this.boss ? this.boss.hp : null;
        this.boss = null;
        this.rushWait = 0;
        this.enemies = this.enemies.filter(e => !e.isHelper);
        this.arenaActive = false;
        for (let r = 0; r < GROUND_ROW; r++) this.level.tiles[r * this.level.width + this.level.arenaStart] = T.EMPTY;
      }
      this.state = 'playing';
      this.snapCamera();
      Sound.playMusic(this.arenaActive ? 'boss' : this.world.song);
    }
  }

  startBoss() {
    const L = this.level;
    this.arenaActive = true;
    for (let r = 0; r < GROUND_ROW; r++) L.tiles[r * L.width + L.arenaStart] = T.BLOCK;
    const arena = { x0: (L.arenaStart + 1) * TILE, x1: (L.width - 2) * TILE };
    const s = this.bossSpawn;
    const rush = s.kind === 'rush' ? this.world.bossRush : null;
    this.boss = new Boss(rush ? rush[this.rushIndex] : s.kind, s.x * TILE, GROUND_ROW * TILE, arena);
    // en el infierno los jefes tienen algo menos de vida (son 6 seguidos)
    if (rush) this.boss.hp = this.boss.maxHp = Math.ceil(this.boss.maxHp * 0.6);
    if (this.bossHpSaved) this.boss.hp = this.bossHpSaved;
    this.bossHpSaved = null;
    Sound.playMusic('boss');
    Sound.play('boss');
    this.shake = 12;
    this.say(this.boss.name, rush ? `Monstruo ${this.rushIndex + 1} de ${rush.length}: ¡salta encima o atácale!` : '¡El monstruo final! Salta encima o atácale');
  }

  onBossDefeated(b) {
    this.addScore(1000, b.cx, b.y);
    const rush = this.bossSpawn && this.bossSpawn.kind === 'rush' ? this.world.bossRush : null;
    if (rush && this.rushIndex < rush.length - 1) {
      // ¡viene el siguiente! (de regalo, un corazón)
      this.rushIndex++;
      this.rushWait = 150;
      this.items.push(new Item('heart', b.cx, b.y + b.h / 2, { fall: true, vy: -6 }));
      this.say(`¡Has vencido a ${b.name}!`, `¡Cuidado! Ahora viene ${BOSS_TYPES[rush[this.rushIndex]].name}`);
      Sound.play('win');
      return;
    }
    this.bossDone = true;
    if (rush) {
      this.items.push(new Item('pocionVida', b.cx, b.y + b.h / 2, { fall: true, vy: -6 }));
      this.say('¡Has vencido a los 6 monstruos!', 'Coge la poción de la vida para salvar a papá');
    } else {
      this.items.push(new Item('diamond', b.cx, b.y + b.h / 2, { fall: true, vy: -6 }));
      this.say(`¡Has vencido a ${b.name}!`, 'Coge el diamante y lánzalo para abrir el portal');
    }
    Sound.play('win');
    Sound.playMusic(this.world.song);
  }

  // Golpe de un monstruo final: el escudo de los monstruos lo para (3 veces)
  bossHurtPlayer(dmg, element, srcX) {
    const p = this.player;
    const armor = this.inv.armor ? ARMORS[this.inv.armor] : null;
    const blocked = ((element === 'bomb' || element === 'lava') && this.inv.escudo) || (element && armor && armor.immune === element);
    if (!blocked && this.inv.escudoJefe > 0 && p.invuln === 0 && !p.dead && this.state === 'playing') {
      this.inv.escudoJefe--;
      p.invuln = INVULN_FRAMES;
      p.vx = (p.x + p.w / 2 < srcX ? -1 : 1) * 4; p.vy = -5; p.bounced = true;
      Sound.play('clank');
      this.sparks(p.x + p.w / 2, p.y + 20, '#c9b6ff', 16);
      this.floatText(p.x + p.w / 2, p.y - 12, this.inv.escudoJefe ? '¡Escudo! Quedan ' + this.inv.escudoJefe : '¡El escudo se ha roto!', '#c9b6ff');
      return true;
    }
    return p.hurt(this, dmg, element, srcX);
  }

  clearHelpers() {
    for (const e of this.enemies) if (e.isHelper && !e.dead) { e.dead = true; this.puff(e.x + e.w / 2, e.y + e.h / 2, '#ffffff', 12); }
    for (const pr of this.projectiles) if (pr.owner === 'enemy') pr.dead = true;
  }

  // ----------------------------------------------------------
  //  Objetos, armas y armaduras
  // ----------------------------------------------------------
  collect(it) {
    const p = this.player;
    const cx = it.x + it.w / 2, cy = it.y;
    if (it.kind === 'coin') {
      this.coins++;
      this.score += 10;
      Sound.play('coin');
      if (this.coins % 100 === 0) { this.lives++; this.say('¡Vida extra!', '100 monedas'); Sound.play('power'); }
      return;
    }
    if (it.kind === 'heart') {
      if (p.hearts < START_HEARTS) p.hearts++;
      else this.score += 50;
      Sound.play('heart');
      this.floatText(cx, cy, '+♥', '#ff8fa3');
      return;
    }
    if (it.kind === 'life') {
      this.lives++;
      Sound.play('power');
      this.sparks(cx, cy, '#7dff9a', 20);
      this.say('¡Vida extra!', '¡Has encontrado un escondite secreto!');
      return;
    }
    if (it.kind === 'pocion') {
      if (this.inv.pocion) this.score += 100;
      this.inv.pocion = true;
      Sound.play('power');
      this.sparks(cx, cy, '#3ddc84', 20);
      this.say('¡Poción antimosquitos!', 'Te salva de una picadura de mosquito (solo una vez)');
      return;
    }
    if (it.kind === 'escudoJefe') {
      this.inv.escudoJefe = BOSS_SHIELD_HITS;
      Sound.play('power');
      this.sparks(cx, cy, '#c9b6ff', 20);
      this.say('¡Escudo de los monstruos!', `Aguanta ${BOSS_SHIELD_HITS} golpes de los monstruos finales`);
      return;
    }
    if (it.kind === 'pocionVida') {
      this.inv.pocionVida = true;
      Sound.play('power');
      this.sparks(cx, cy, '#ff6b8b', 26);
      if (!this.portal) this.openPortal((this.level.width - 6) * TILE, GROUND_ROW * TILE);
      this.say('¡La poción de la vida!', 'Entra en el portal para volver con papá');
      return;
    }
    if (it.kind === 'escudo') {
      this.inv.escudo = true;
      Sound.play('power');
      this.sparks(cx, cy, '#ffd166', 20);
      this.say('¡Escudo mágico!', 'Te protege de las bombas y puedes andar sobre la lava');
      return;
    }
    if (it.kind === 'diamond') {
      this.hasDiamond = true;
      Sound.play('power');
      this.sparks(cx, cy, '#5ce1e6', 20);
      this.say('¡Diamante mágico!', 'Pulsa X (o el botón 💎) para lanzarlo y abrir el portal');
      return;
    }
    const [type, id] = it.kind.split(':');
    Sound.play('power');
    this.sparks(cx, cy, '#fff8c0', 20);
    if (type === 'weapon') {
      if (!this.inv.weapons.includes(id)) this.inv.weapons.push(id);
      this.inv.weapon = id;
      const n = WEAPON_ORDER.indexOf(id) + 1;
      this.say(`¡Nueva arma: ${WEAPONS[id].name}!`, `Pulsa ${n} o Q / E para cambiar de arma`);
    } else {
      if (!this.inv.armors.includes(id)) this.inv.armors.push(id);
      this.inv.armor = id;
      const a = ARMORS[id];
      p.shield = p.maxShield();
      const extra = a.immune === 'fire' ? ' · ¡Inmune al fuego!' : a.immune === 'ice' ? ' · ¡Inmune al hielo!' : '';
      this.say(`¡Armadura y casco ${a.title || 'de ' + a.name}!`, `Aguanta ${a.shield} golpes${extra} · C para cambiar`);
    }
  }

  selectWeapon(id) {
    if (!this.inv.weapons.includes(id) || this.inv.weapon === id) return;
    this.inv.weapon = id;
    Sound.play('tick');
    const p = this.player;
    this.floatText(p.x + p.w / 2, p.y - 14, WEAPONS[id].name, '#ffe14d');
  }

  cycleWeapon(dir) {
    const owned = WEAPON_ORDER.filter(w => this.inv.weapons.includes(w));
    if (owned.length < 2) return;
    const i = owned.indexOf(this.inv.weapon);
    this.selectWeapon(owned[(i + dir + owned.length) % owned.length]);
  }

  cycleArmor() {
    const p = this.player;
    const owned = ARMOR_ORDER.filter(a => this.inv.armors.includes(a));
    if (!owned.length) { this.floatText(p.x + p.w / 2, p.y - 14, 'Aún no tienes armadura', '#ffffff'); return; }
    const i = owned.indexOf(this.inv.armor);
    this.inv.armor = owned[(i + 1) % owned.length];
    p.shield = p.maxShield();
    Sound.play('clank');
    this.floatText(p.x + p.w / 2, p.y - 14, 'Armadura de ' + ARMORS[this.inv.armor].name, ARMORS[this.inv.armor].shine);
  }

  throwDiamond() {
    if (!this.hasDiamond || this.portal || this.state !== 'playing') return;
    const p = this.player;
    this.hasDiamond = false;
    this.projectiles.push(new Projectile('diamond', p.x + p.w / 2, p.y + 10, p.facing * 3.5, -7, 'player', 0, { gravity: 0.35, life: 600 }));
    Sound.play('throw');
  }

  openPortal(cx, groundY) {
    this.portal = new Portal(cx, groundY);
    Sound.play('portal');
    this.sparks(cx, groundY - 20, '#c89bff', 24);
    this.say('¡Portal abierto!', 'Entra en el portal para pasar de mundo');
  }

  levelClear() {
    const p = this.player;
    this.state = 'levelclear';
    this.timer = 0;
    p.hidden = true;
    this.puff(p.x + p.w / 2, p.y + p.h / 2, '#e8d0ff', 20);
    Sound.stopMusic();
    Sound.play('victory');
    this.score += this.coins * 5;
    const next = this.worldIndex + 1;
    this.save = next < WORLDS.length ? { world: next, part: 0, inv: cloneInv(this.inv), score: this.score } : null;
    writeSave(this.save);
  }

  // Golpe cuerpo a cuerpo a un enemigo normal (con efectos de las espadas elementales)
  weaponHit(e, W, srcX) {
    const weak = W.element && e.d.weak === W.element;
    e.hurt(this, W.dmg * (weak ? 2 : 1), srcX);
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (weak && !e.dead) this.floatText(cx, e.y - 8, '¡Súper golpe!', '#ffe14d');
    if (W.element === 'fire') this.sparks(cx, cy, '#ffb02e', 10);
    else if (W.element === 'ice') {
      this.sparks(cx, cy, '#bdefff', 10);
      if (!e.dead && W.freeze && !e.d.fiery) { e.frozen = W.freeze; Sound.play('ice'); }
    } else this.sparks(cx, cy, '#ffffff', 6);
  }

  bombExplode(x, y) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4;
      this.particles.push(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, ['#ffe14d', '#ffb02e', '#ff5a1f', '#666'][i % 4], 30, 7, -0.02));
    }
    Sound.play('thud');
    this.shake = Math.max(this.shake, 8);
    const p = this.player;
    if (Math.hypot(p.x + p.w / 2 - x, p.y + p.h / 2 - y) < 62) {
      if (this.boss) this.bossHurtPlayer(1, 'bomb', x);
      else p.hurt(this, 1, 'bomb', x);
    }
  }

  dropItem(kind, cx, cy) {
    this.items.push(new Item(kind, cx, cy, { fall: true, vy: -5, vx: (Math.random() - 0.5) * 3, life: 600 }));
  }

  nearestTarget(x, y, range) {
    let best = null, bd = range;
    for (const e of this.enemies) {
      if (e.dead || !this.onScreen(e)) continue;
      const d = Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y);
      if (d < bd) { bd = d; best = { x: e.x + e.w / 2, y: e.y + e.h / 2 }; }
    }
    const b = this.boss;
    if (b && !b.dying && b.state !== 'intro' && !b.ghost) {
      const hb = b.hitbox();
      const d = Math.hypot(hb.x + hb.w / 2 - x, hb.y + hb.h / 2 - y);
      if (d < bd + 120) best = { x: hb.x + hb.w / 2, y: hb.y + hb.h / 2 };
    }
    return best;
  }

  // ----------------------------------------------------------
  //  Cámara, mensajes y partículas
  // ----------------------------------------------------------
  cameraTarget() {
    const L = this.level, p = this.player;
    let t = p.x + p.w / 2 - VIEW_W * 0.42;
    if (this.arenaActive) t = L.arenaStart * TILE;
    return clamp(t, 0, L.width * TILE - VIEW_W);
  }
  // en los niveles altos (descenso) la cámara también sigue al ninja en vertical
  cameraTargetY() {
    const L = this.level, p = this.player;
    const maxY = levelBottom(L) - VIEW_H;
    return maxY > 0 ? clamp(p.y + p.h / 2 - VIEW_H * 0.45, 0, maxY) : 0;
  }
  updateCamera() {
    this.camX += (this.cameraTarget() - this.camX) * (this.arenaActive ? 0.06 : 0.15);
    this.camY += (this.cameraTargetY() - this.camY) * 0.2;
  }
  snapCamera() { this.camX = this.cameraTarget(); this.camY = this.cameraTargetY(); }

  say(title, sub) { this.msg = { title, sub, t: 230 }; }
  addScore(n, x, y) { this.score += n; if (x != null) this.floatText(x, y, '+' + n, '#ffe14d'); }
  floatText(x, y, text, color) { this.particles.push(new Particle(x, y, 0, -0.8, color, 70, 16, 0, text)); }

  dust(x, y) {
    for (let i = 0; i < 5; i++) this.particles.push(new Particle(x + (Math.random() - 0.5) * 16, y - 2, (Math.random() - 0.5) * 2, -Math.random() * 1.2, 'rgba(230,230,230,0.8)', 20, 4, 0.02));
  }
  puff(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 2.5;
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, 26, 6, 0));
    }
  }
  sparks(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 4;
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, 18, 3, 0.2));
    }
  }
  explosion(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3;
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, i % 2 ? '#ffb02e' : '#ffe14d', 30, 7, -0.03));
    }
    if (Math.random() < 0.3) Sound.play('pop');
  }
  firework(x, y) {
    const colors = ['#ff4d6d', '#ffe14d', '#5ce1e6', '#7dff9a', '#c89bff'];
    const c = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2;
      this.particles.push(new Particle(x, y, Math.cos(a) * 3.5, Math.sin(a) * 3.5, c, 50, 4, 0.06));
    }
    Sound.play('pop');
  }
  updateParticles() {
    for (const p of this.particles) p.update();
    this.particles = this.particles.filter(p => !p.dead);
  }

  // ----------------------------------------------------------
  //  Dibujo
  // ----------------------------------------------------------
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.state === 'ending') { this.drawEnding(); return; }
    if (this.state === 'title' || !this.level) { this.drawTitle(); return; }

    const f = this.frame;
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const L = this.level;
    ctx.save();
    ctx.translate(sx, sy);
    Art.background(ctx, L.theme, this.camX, f, this.camY);
    ctx.translate(-Math.round(this.camX), -Math.round(this.camY));

    for (const w of this.winds) Art.wind(ctx, w, f);
    Art.tiles(ctx, L, this.camX, f, this.camY);
    if (L.exit) Art.hellGate(ctx, L.exit, f);
    for (const c of this.checkpoints) Art.checkpoint(ctx, c, f);
    for (const j of this.jets) Art.jet(ctx, j, f);
    for (const s of this.springs) Art.spring(ctx, s, f);
    for (const pl of this.platforms) if (pl.solid || pl.state !== 'gone' || pl.style === 'blink') Art.platform(ctx, pl, L.theme, f);
    for (const c of this.crushers) Art.crusher(ctx, c);
    for (const d of this.droppers) Art.dropper(ctx, d, f);
    for (const it of this.items) Art.item(ctx, it);
    if (this.portal) Art.portal(ctx, this.portal);
    for (const e of this.enemies) if (this.onScreen(e)) Art.enemy(ctx, e);
    if (this.boss) Art.boss(ctx, this.boss);
    for (const d of this.friends) Art.friend(ctx, d, f);
    if (!this.player.hidden) Art.player(ctx, this.player);
    for (const fb of this.firebars) Art.firebar(ctx, fb, f);
    for (const pr of this.projectiles) Art.projectile(ctx, pr);
    for (const p of this.particles) Art.particle(ctx, p);
    ctx.restore();

    this.drawHUD();
    this.drawOverlay();
  }

  drawHUD() {
    const ctx = this.ctx, p = this.player;
    // corazones y armadura
    Art.box(ctx, 8, 8, this.inv.escudoJefe ? 330 : 290, 66, 14, 'rgba(20,12,40,0.55)');
    for (let i = 0; i < START_HEARTS; i++) Art.heart(ctx, 28 + i * 28, 28, 10, i < p.hearts ? '#ff4d6d' : 'rgba(255,255,255,0.22)');
    const armor = p.inv.armor ? ARMORS[p.inv.armor] : null;
    if (armor) {
      const max = p.maxShield();
      for (let i = 0; i < max; i++) Art.shieldIcon(ctx, 24 + i * 22, 54, 7, i < p.shield ? armor.color : 'rgba(255,255,255,0.2)');
    }
    Art.ninjaHead(ctx, 185, 28, 11);
    Art.text(ctx, 'x' + this.lives, 202, 29, 20, '#fff', 'left');
    Art.ellipse(ctx, 185, 55, 8, 9, '#e0a800'); Art.ellipse(ctx, 185, 55, 5.5, 6.5, '#ffd43b');
    Art.text(ctx, 'x' + this.coins, 202, 56, 18, '#ffe14d', 'left');
    if (this.inv.pocion) Art.potion(ctx, 272, 41, 12 + Math.sin(this.frame * 0.12));
    if (this.inv.escudoJefe) {
      Art.bossShield(ctx, 312, 36, 12);
      Art.text(ctx, 'x' + this.inv.escudoJefe, 312, 62, 13, '#c9b6ff');
    }
    // energía de vuelo (espada láser)
    if (this.inv.weapons.includes('espadaLaser')) {
      Art.box(ctx, 8, 80, 150, 20, 8, 'rgba(20,12,40,0.55)');
      Art.text(ctx, 'Vuelo', 16, 91, 12, '#7df9ff', 'left');
      Art.box(ctx, 58, 85, 92 * (p.flyE / FLY.energy), 10, 5, p.flying ? '#ff4dd2' : '#7df9ff');
    }

    // mundo y puntos
    Art.text(ctx, this.world.short, VIEW_W / 2 - 40, 24, 18, '#ffffff');
    Art.text(ctx, String(this.score).padStart(6, '0'), VIEW_W / 2 - 40, 50, 20, '#ffe14d');

    // ranuras: 7 armas, armadura (C), escudo y diamante (X)
    const NW = WEAPON_ORDER.length, slots = NW + 3, step = 40, sz = 36;
    const x0 = VIEW_W - 8 - slots * step + 4;
    for (let i = 0; i < slots; i++) {
      const x = x0 + i * step, y = 10, cx = x + sz / 2, cy = y + sz / 2;
      let owned, sel = false;
      if (i < NW) { const id = WEAPON_ORDER[i]; owned = this.inv.weapons.includes(id); sel = this.inv.weapon === id; }
      else if (i === NW) owned = !!armor;
      else if (i === NW + 1) owned = !!this.inv.escudo;
      else owned = this.hasDiamond;
      Art.box(ctx, x, y, sz, sz, 8, owned ? 'rgba(20,12,40,0.6)' : 'rgba(20,12,40,0.3)');
      if (sel) { ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; Art.rr(ctx, x, y, sz, sz, 8); ctx.stroke(); }
      if (i < NW) {
        if (owned) Art.weaponIcon(ctx, WEAPON_ORDER[i], cx, cy, 11);
        else Art.text(ctx, '?', cx, cy + 1, 18, 'rgba(255,255,255,0.35)', 'center', 'rgba(0,0,0,0)');
        Art.text(ctx, String(i + 1), x + 6, y + 7, 10, '#ffffff');
      } else if (i === NW) {
        if (armor) Art.armorIcon(ctx, cx, cy + 3, 9, armor);
        Art.text(ctx, 'C', x + 6, y + 7, 10, '#ffffff');
      } else if (i === NW + 1) {
        if (this.inv.escudo) Art.shieldItem(ctx, cx, cy + 1, 11);
      } else {
        if (this.hasDiamond) Art.diamond(ctx, cx, cy, 9 + Math.sin(this.frame * 0.15), this.frame);
        Art.text(ctx, 'X', x + 6, y + 7, 10, '#ffffff');
      }
    }
    Art.text(ctx, WEAPONS[this.inv.weapon].name, x0 + (NW / 2) * step - 2, 60, 13, '#ffe14d');
    if (armor) Art.text(ctx, armor.name, x0 + NW * step + sz / 2, 60, 11, armor.shine);

    // barra de vida del jefe
    const b = this.boss;
    if (b) {
      const w = 420, x = VIEW_W / 2 - w / 2, y = VIEW_H - 30;
      Art.box(ctx, x - 4, y - 4, w + 8, 22, 10, 'rgba(20,12,40,0.75)');
      Art.box(ctx, x, y, w * (b.hp / b.maxHp), 14, 7, b.hp / b.maxHp > 0.6 ? '#ff4d6d' : '#ff9f1c');
      Art.text(ctx, b.name, VIEW_W / 2, y - 14, 18, '#ffffff');
    }

    // mensaje
    if (this.msg) {
      const a = Math.min(1, this.msg.t / 30);
      ctx.globalAlpha = a;
      Art.box(ctx, VIEW_W / 2 - 300, 88, 600, 64, 16, 'rgba(20,12,40,0.7)');
      Art.text(ctx, this.msg.title, VIEW_W / 2, 108, 24, '#ffe14d');
      Art.text(ctx, this.msg.sub, VIEW_W / 2, 136, 15, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }

  dim(a = 0.6) { this.ctx.fillStyle = `rgba(15,8,35,${a})`; this.ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  blink() { return Math.floor(this.frame / 30) % 2 === 0; }

  drawOverlay() {
    const ctx = this.ctx, cx = VIEW_W / 2;
    switch (this.state) {
      case 'intro': {
        this.dim(0.7);
        Art.text(ctx, this.world.name, cx, 150, 40, '#ffe14d');
        Art.text(ctx, this.world.bossRush ? 'Al final: ¡los 6 monstruos finales otra vez!' : 'Monstruo final: ' + BOSS_TYPES[this.world.boss].name, cx, 210, 22, '#ff8fa3');
        Art.text(ctx, this.world.tip, cx, 260, 17, '#ffffff');
        Art.ninjaHead(ctx, cx - 30, 330, 16);
        Art.text(ctx, 'x ' + this.lives, cx + 10, 331, 24, '#ffffff', 'left');
        if (this.timer > 30 && this.blink()) Art.text(ctx, 'Pulsa ENTER o salta para empezar', cx, 420, 20, '#ffffff');
        break;
      }
      case 'paused':
        this.dim(0.65);
        Art.text(ctx, 'PAUSA', cx, 120, 46, '#ffe14d');
        this.drawControls(190);
        Art.text(ctx, 'Pulsa P para seguir', cx, 470, 20, '#ffffff');
        break;
      case 'levelclear':
        Art.text(ctx, '¡MUNDO SUPERADO!', cx, 180, 46, '#ffe14d');
        Art.text(ctx, 'Monedas: ' + this.coins + '   ·   Puntos: ' + this.score, cx, 240, 22, '#ffffff');
        break;
      case 'gameover':
        this.dim(0.75);
        Art.text(ctx, '¡Oh, no!', cx, 190, 50, '#ff8fa3');
        Art.text(ctx, 'Te has quedado sin vidas', cx, 250, 24, '#ffffff');
        if (this.timer > 60 && this.blink()) Art.text(ctx, 'Pulsa ENTER para intentarlo otra vez', cx, 330, 22, '#ffe14d');
        break;
    }
  }

  drawControls(y) {
    const ctx = this.ctx;
    const lines = [
      '← →  moverse',
      '↑ / Espacio  saltar  (en el aire: ¡doble salto!)',
      '↓ + salto  bajar de una plataforma',
      'Z  atacar          Q / E  o  1-8  cambiar de arma',
      'C  cambiar de armadura          X  lanzar el diamante',
      'P  pausa          M  sonido',
    ];
    lines.forEach((l, i) => Art.text(ctx, l, VIEW_W / 2, y + i * 38, 18, '#ffffff'));
  }

  drawTitle() {
    const ctx = this.ctx, f = this.frame, cx = VIEW_W / 2;
    Art.bgCity(ctx, f * 0.8, f);
    ctx.fillStyle = '#474a54'; ctx.fillRect(0, VIEW_H - 40, VIEW_W, 40);
    ctx.fillStyle = '#a2a8b3'; ctx.fillRect(0, VIEW_H - 40, VIEW_W, 8);

    Art.text(ctx, 'VIAJE NINJA', cx + 4, 92, 74, '#1b1030', 'center', '#1b1030');
    Art.text(ctx, 'VIAJE NINJA', cx, 88, 74, '#ffe14d', 'center', '#e63946');
    Art.text(ctx, '¡Rescata a tu familia de los monstruos!', cx, 146, 22, '#ffffff');

    // el ninja saltando
    const jump = Math.abs(Math.sin(f * 0.05)) * 40;
    const fake = {
      x: 0, y: 0, w: 26, h: 46, facing: 1, dead: false, invuln: 0, flip: 0, slow: 0,
      inv: { weapon: WEAPON_ORDER[Math.floor(f / 120) % WEAPON_ORDER.length], armor: ARMOR_ORDER[Math.floor(f / 120) % ARMOR_ORDER.length], escudo: f % 240 > 120 },
      vx: 1, onGround: jump < 2, anim: f, attackTimer: 0, attackCooldown: 30,
    };
    ctx.save();
    ctx.translate(cx - 40, VIEW_H - 40 - jump * 1.5);
    ctx.scale(2.6, 2.6);
    ctx.translate(-13, -46);
    Art.player(ctx, fake);
    ctx.restore();

    // villanos
    ctx.save(); ctx.translate(150, VIEW_H - 40); ctx.scale(-1, 1); Art.metal(ctx, 70, 76, f, true, false); ctx.restore();
    ctx.save(); ctx.translate(VIEW_W - 150, VIEW_H - 40); ctx.scale(-1, 1);
    Art.knight(ctx, 46, 80, f, { armor: '#2d2d3a', dark: '#1d1d26', tabard: '#3d1020', cross: '#f5f5f5', crown: '#f5c518', cape: '#8e1b2b', eyes: '#ff3b3b', sword: 44 }, { walking: false });
    ctx.restore();
    ctx.save(); ctx.translate(VIEW_W - 220, 230 + Math.sin(f * 0.05) * 10); ctx.scale(-1.6, 1.6);
    Art.dragon(ctx, 1, { body: '#6a3d9a', belly: '#c9a6e8', wing: '#3d2160', wingDark: '#2b1747', horn: '#f5c518', spike: '#f5c518' }, f, 'angry');
    ctx.restore();

    Art.box(ctx, cx - 230, 190, 460, 120, 16, 'rgba(20,12,40,0.6)');
    if (this.save) {
      Art.text(ctx, 'ENTER: continuar en ' + WORLDS[clamp(this.save.world, 0, WORLDS.length - 1)].short, cx, 222, 22, '#ffe14d');
      Art.text(ctx, 'N: empezar una partida nueva', cx, 256, 18, '#ffffff');
    } else if (this.blink()) {
      Art.text(ctx, 'Pulsa ENTER o toca para empezar', cx, 238, 24, '#ffe14d');
    }
    Art.text(ctx, '← → moverse · Espacio saltar · Z atacar', cx, 290, 15, '#ffffff');
  }

  // ----------------------------------------------------------
  //  Escenas finales (en la mazmorra), el jugador maneja al ninja:
  //  'rescue': abre la jaula... pero los mosquitos pican a papá
  //  'cure':   vuelve del infierno y le da la poción de la vida
  // ----------------------------------------------------------
  startEnding(mode = 'rescue') {
    this.state = 'ending';
    this.timer = 0;
    this.particles = [];
    this.camX = 0; this.camY = 0;
    this.shake = 0;
    this.end = { mode, x: 80, h: 0, vy: 0, facing: 1, jumps: 2, flip: 0, moving: false,
                 atk: 0, cd: 0, shots: [], hits: 0, wobble: 0, open: -1, cure: -1, potion: null, mosq: [] };
    Sound.stopMusic();
    if (mode === 'cure') Sound.playMusic('sad');
  }

  // Control del ninja en la escena final (en píxeles de pantalla, escala 1,6).
  // Devuelve true si el jugador ha pulsado atacar este frame.
  endingControl(n, maxX, locked) {
    const dir = locked ? 0 : (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0);
    n.moving = dir !== 0;
    if (dir) n.facing = dir;
    n.x = clamp(n.x + dir * 3.5, 30, maxX);
    if (!locked && Input.pressed('jump') && n.jumps > 0) {
      n.vy = n.h === 0 ? -11 : -9.5;
      if (n.h > 0) n.flip = 24;
      n.jumps--;
      Sound.play(n.h === 0 ? 'jump' : 'djump');
    }
    n.vy += 0.5; n.h -= n.vy;
    if (n.h <= 0) { n.h = 0; n.vy = 0; n.jumps = 2; }
    if (n.flip > 0) n.flip--;
    if (n.atk > 0) n.atk--;
    if (n.cd > 0) n.cd--;
    for (const s of n.shots) {
      s.x += s.vx; s.t++;
      if (s.x + s.w / 2 < -40 || s.x + s.w / 2 > VIEW_W + 40) s.dead = true;
    }
    n.shots = n.shots.filter(s => !s.dead);
    return !locked && Input.pressed('attack') && n.cd === 0;
  }

  // Ataque en la escena final: golpe de cerca o disparo
  endingAttack(n) {
    const W = WEAPONS[this.inv.weapon] || WEAPONS.baston;
    n.cd = W.cooldown; n.atk = W.duration || 10;
    const kind = W.type === 'proj' ? W.proj : W.shot ? W.shot.kind : null;
    if (kind) n.shots.push(new Projectile(kind, n.x + n.facing * 30, ENDING.floor - n.h - 46, n.facing * 8, 0, 'player', 1, { element: W.element }));
    Sound.play(W.type === 'proj' ? 'throw' : 'swing');
    return W;
  }

  updateEnding() {
    this.updateParticles();
    if (this.end.mode === 'cure') this.updateCure();
    else this.updateRescue();
  }

  updateRescue() {
    const E = ENDING, n = this.end;
    if (n.open >= 0) n.open++;
    const o = n.open;

    // a partir de que llegan los mosquitos, la escena sigue sola
    const locked = o >= 340;
    let maxX = o >= 0 ? VIEW_W - 30 : E.cageX - 85 - 22;
    // el ninja se aparta poco a poco para dejar sitio a los papás
    const room = o > 440 ? 340 : o > 80 ? 440 : maxX;
    maxX = n.x > room ? Math.max(room, n.x - 2.5) : Math.min(maxX, room);
    if (locked) { n.facing = 1; n.atk = 0; }
    if (this.endingControl(n, maxX, locked)) {
      const W = this.endingAttack(n);
      const reach = W.type === 'melee' ? (W.range || 52) * 1.6 + 10 : 0;
      if (o < 0 && reach && n.facing === 1 && E.lockX - n.x < reach && n.h < 120) this.hitLock();
    }
    for (const s of n.shots) {
      if (o < 0 && s.vx > 0 && s.x + s.w / 2 > E.lockX - 8 && Math.abs(s.y + s.h / 2 - E.lockY) < 70) { s.dead = true; this.hitLock(); }
    }
    if (n.wobble > 0) n.wobble--;

    // --- después de abrir la jaula ---
    if (o === 15) Sound.play('portal');
    if (o === 190) { Sound.play('victory'); Sound.playMusic('ending'); }
    if (o > 190 && o < 360 && o % 30 === 0) {
      for (const x of [E.dadTo, E.momTo]) this.particles.push(new Particle(x + (Math.random() - 0.5) * 30, E.floor - 150, (Math.random() - 0.5), -1, '#ff6b8b', 60, 22, -0.01, '♥'));
    }
    if (o > 210 && o < 340 && o % 24 === 0) this.firework(80 + Math.random() * (VIEW_W - 160), 50 + Math.random() * 120);

    // --- ¡llegan los mosquitos y pican a papá! ---
    if (o === 360) {
      Sound.stopMusic();
      Sound.play('buzz');
      n.mosq = [0, 1, 2].map(i => ({ x: VIEW_W + 30 + i * 50, y: 90 + i * 60, t: i * 20 }));
    }
    const bite = { x: E.dadTo - 4, y: E.floor - 108 };
    for (const m of n.mosq) {
      m.t++;
      if (o < 450) {
        // vuelan zumbando hacia papá
        const k = clamp((o - 360) / 90, 0, 1);
        m.x += (bite.x + Math.sin(m.t * 0.2) * 22 - m.x) * (0.03 + k * 0.1);
        m.y += (bite.y + Math.cos(m.t * 0.17) * 16 - m.y) * (0.03 + k * 0.1);
      } else { m.x += 3.5; m.y -= 2.2; } // y se van
      if (o % 40 === 0 && o < 450) Sound.play('buzz');
    }
    if (o === 450) {
      Sound.play('hurt');
      this.sparks(bite.x, bite.y, '#ff5a5a', 20);
      this.floatText(bite.x, bite.y - 30, '¡Picadura!', '#ff5a5a');
    }
    if (o === 480) { Sound.play('sad'); Sound.playMusic('sad'); }
    if (o > 860 && Input.pressed('start')) {
      // ¡al infierno a por la poción!
      this.end = null; this.particles = [];
      this.loadWorld(WORLDS.length - 1);
    }
  }

  // Un golpe al candado: hacen falta LOCK_HITS para abrir la jaula
  hitLock() {
    const E = ENDING, n = this.end;
    n.hits++;
    n.wobble = 14;
    this.sparks(E.lockX, E.lockY, '#ffe14d', 12);
    if (n.hits < LOCK_HITS) {
      Sound.play('clank');
      this.floatText(E.lockX, E.lockY - 85, n.hits === LOCK_HITS - 1 ? '¡Uno más!' : '¡Clanc!', '#ffe14d');
    } else {
      n.open = 0;
      Sound.play('power');
      this.sparks(E.lockX, E.lockY, '#ffffff', 26);
      this.floatText(E.lockX, E.lockY - 85, '¡Abierto!', '#7dff9a');
    }
  }

  updateCure() {
    const E = ENDING, n = this.end;
    if (n.cure >= 0) n.cure++;
    const c = n.cure;
    // papá está tumbado: el ninja se acerca y le da la poción con Z
    const near = n.x > E.dadLie - 120;
    if (this.endingControl(n, c >= 0 && c > 140 ? VIEW_W - 30 : E.dadLie - 40, false)) {
      if (c < 0 && near && n.h < 40) {
        n.cure = 0; n.atk = 12; n.cd = 20; n.facing = 1;
        n.potion = { x: n.x + 20, y: E.floor - 70 };
        Sound.play('throw');
      } else this.endingAttack(n);
    }
    // la poción vuela hasta papá
    if (n.potion && c >= 0 && c <= 40) {
      const k = c / 40;
      n.potion.x = n.x + 20 + (E.dadLie + 30 - n.x - 20) * k;
      n.potion.y = E.floor - 70 - Math.sin(k * Math.PI) * 90 + k * 40;
    }
    if (c === 40) {
      n.potion = null;
      Sound.play('power');
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3;
        this.particles.push(new Particle(E.dadLie + 40, E.floor - 20, Math.cos(a) * sp, Math.sin(a) * sp - 1, i % 2 ? '#ff6b8b' : '#7dff9a', 50, 5, -0.02));
      }
    }
    if (c > 40 && c < 130 && c % 4 === 0) {
      this.particles.push(new Particle(E.dadLie + Math.random() * 90, E.floor - Math.random() * 30, 0, -1.5, Math.random() < 0.5 ? '#7dff9a' : '#ffffff', 40, 4, -0.01));
    }
    if (c === 130) { Sound.play('victory'); Sound.playMusic('ending'); }
    if (c > 140 && c % 30 === 0) {
      for (const x of [E.dadTo, E.momTo]) this.particles.push(new Particle(x + (Math.random() - 0.5) * 30, E.floor - 150, (Math.random() - 0.5), -1, '#ff6b8b', 60, 22, -0.01, '♥'));
    }
    if (c > 160 && c % 24 === 0) this.firework(80 + Math.random() * (VIEW_W - 160), 50 + Math.random() * 120);
    if (c > 320 && Input.pressed('start')) {
      this.save = null; writeSave(null);
      this.state = 'title'; this.level = null; this.particles = []; this.end = null;
      Sound.playMusic('title');
    }
  }

  drawEnding() {
    if (this.end.mode === 'cure') this.drawCure();
    else this.drawRescue();
  }

  // El ninja de la escena final (lo maneja el jugador)
  drawEndingNinja(n) {
    const ctx = this.ctx, f = this.frame;
    const fake = {
      x: 0, y: 0, w: 26, h: 46, facing: n.facing, dead: false, invuln: 0, slow: 0, flip: n.flip,
      inv: this.inv, vx: n.moving ? 3 * n.facing : 0, onGround: n.h === 0, vy: n.vy, anim: f,
      attackTimer: n.atk, attackCooldown: n.cd,
    };
    ctx.save(); ctx.translate(n.x, ENDING.floor - n.h); ctx.scale(1.6, 1.6); ctx.translate(-13, -46); Art.player(ctx, fake); ctx.restore();
    for (const s of n.shots) Art.projectile(ctx, s);
  }

  drawRescue() {
    const ctx = this.ctx, cx = VIEW_W / 2, f = this.frame, E = ENDING, n = this.end, o = n.open;
    Art.dungeon(ctx, f);

    const ease = k => 0.5 - 0.5 * Math.cos(clamp(k, 0, 1) * Math.PI);
    const bars = o < 0 ? 0 : ease((o - 15) / 70);
    const out = o < 0 ? 0 : ease((o - 90) / 100);
    const happy = o > 110 && o < 400;
    const hop = k => o > 190 && o < 360 ? Math.abs(Math.sin((f + k) * 0.12)) * 18 : 0;
    const dadX = E.dadFrom + (E.dadTo - E.dadFrom) * out;
    const momX = E.momFrom + (E.momTo - E.momFrom) * out;
    const fall = ease((o - 450) / 40); // papá se cae tras la picadura

    // familia (dentro de la jaula al principio)
    Art.parent(ctx, dadX, E.floor - hop(0), 'dad', f, happy, out > 0 && out < 1, fall);
    Art.parent(ctx, momX, E.floor - hop(20), 'mom', f, happy, out > 0 && out < 1);
    ctx.save();
    if (n.wobble > 0) ctx.translate(Math.sin(n.wobble * 1.7) * 3, 0);
    Art.cage(ctx, E.cageX, E.floor, bars, o < 0, f);
    ctx.restore();
    // grietas del candado según los golpes
    if (o < 0 && n.hits > 0) {
      ctx.strokeStyle = '#5a4400'; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(E.lockX - 9, E.lockY - 3); ctx.lineTo(E.lockX - 3, E.lockY + 4); ctx.lineTo(E.lockX - 7, E.lockY + 10);
      if (n.hits > 1) { ctx.moveTo(E.lockX + 9, E.lockY - 4); ctx.lineTo(E.lockX + 4, E.lockY + 3); ctx.lineTo(E.lockX + 8, E.lockY + 11); }
      ctx.stroke();
    }

    this.drawEndingNinja(n);
    for (const m of n.mosq) {
      ctx.save(); ctx.translate(m.x, m.y + 8); ctx.scale(m.x > E.dadTo && o < 450 ? -1.6 : 1.6, 1.6);
      Art.mosquito(ctx, { t: m.t, w: 18, h: 16 });
      ctx.restore();
    }

    const W = WEAPONS[this.inv.weapon];
    if (o < 0) {
      Art.speech(ctx, E.momFrom + 10, E.floor - 140, n.hits ? '¡Sigue así!' : '¡Socorro!');
      // flecha que señala el candado
      Art.text(ctx, '▼', E.lockX, E.lockY - 30 - Math.abs(Math.sin(f * 0.1)) * 10, 22, '#ffe14d');
      Art.text(ctx, '¡Rescata a tu familia!', cx, 60, 34, '#ffe14d', 'center', '#e63946');
      const how = W && W.type === 'proj' ? 'Dispara al candado con Z' : 'Acércate al candado y golpéalo con Z';
      Art.text(ctx, how + '  (' + n.hits + ' / ' + LOCK_HITS + ')', cx, 102, 20, '#ffffff');
    } else if (o > 100 && o < 190) Art.speech(ctx, E.dadTo + 30, E.floor - 150, '¡Gracias, ninja!');
    else if (o > 365 && o < 450) Art.speech(ctx, E.momTo + 10, E.floor - 150, '¡Cuidado! ¡Mosquitos!');
    else if (o > 500 && o < 640) Art.speech(ctx, E.momTo + 10, E.floor - 150, '¡Papá se muere!');
    else if (o >= 640 && o < 760) Art.speech(ctx, n.x + 10, E.floor - 120, '¡Mamá, no llores!');
    else if (o >= 760) {
      Art.speech(ctx, n.x + 90, E.floor - 120, 'Viajaré al infierno a por la poción que salvará a papá');
      if (o > 820) Art.speech(ctx, E.momTo + 20, E.floor - 175, '¡Ten mucho cuidado, hijo!');
    }

    for (const p of this.particles) Art.particle(ctx, p);

    if (o > 190 && o < 360) {
      Art.text(ctx, '¡HAS RESCATADO A TU FAMILIA!', cx, 70, 40, '#ffe14d', 'center', '#e63946');
      Art.text(ctx, 'Has vencido a los 6 monstruos. ¡Eres el mejor ninja!', cx, 118, 20, '#ffffff');
      Art.text(ctx, 'Puntos: ' + this.score, cx, 152, 22, '#ffe14d');
    } else if (o > 470) {
      Art.text(ctx, '¡Oh, no! ¡Los mosquitos han picado a papá!', cx, 70, 32, '#ff8fa3', 'center', '#1b1030');
      if (o > 760) Art.text(ctx, 'Solo la poción de la vida del infierno puede salvarlo', cx, 112, 20, '#ffffff');
    }
    if (o > 860 && this.blink()) Art.text(ctx, 'Pulsa ENTER para viajar al infierno', cx, VIEW_H - 22, 20, '#ffe14d');
  }

  drawCure() {
    const ctx = this.ctx, cx = VIEW_W / 2, f = this.frame, E = ENDING, n = this.end, c = n.cure;
    Art.dungeon(ctx, f);
    Art.cage(ctx, E.cageX, E.floor, 1, false, f);
    const ease = k => 0.5 - 0.5 * Math.cos(clamp(k, 0, 1) * Math.PI);
    const fall = c < 0 ? 1 : 1 - ease((c - 60) / 60); // papá se levanta
    const happy = c > 120;
    const hop = k => c > 140 ? Math.abs(Math.sin((f + k) * 0.12)) * 18 : 0;
    // papá brilla mientras la poción hace efecto
    if (c > 40 && c < 160) Art.circle(ctx, E.dadTo - 40 * fall, E.floor - 50, 70 + Math.sin(f * 0.3) * 6, `rgba(125,255,154,${0.25 * (1 - Math.max(0, c - 120) / 40)})`);
    Art.parent(ctx, E.dadTo, E.floor - hop(0), 'dad', f, happy, false, fall);
    Art.parent(ctx, E.momTo, E.floor - hop(20), 'mom', f, happy, false);

    this.drawEndingNinja(n);
    // el ninja lleva la poción en alto hasta dársela
    if (c < 0) Art.lifePotion(ctx, n.x + n.facing * 6, E.floor - n.h - 100 + Math.sin(f * 0.1) * 3, 13);
    else if (n.potion) Art.lifePotion(ctx, n.potion.x, n.potion.y, 13);

    if (c < 0) {
      Art.speech(ctx, E.momTo + 10, E.floor - 150, '¡Rápido, la poción!');
      Art.text(ctx, '¡Salva a papá!', cx, 60, 34, '#ffe14d', 'center', '#e63946');
      Art.text(ctx, 'Acércate a papá y pulsa Z para darle la poción de la vida', cx, 102, 20, '#ffffff');
      if (n.x > E.dadLie - 120) Art.text(ctx, '▼', E.dadLie + 30, E.floor - 70 - Math.abs(Math.sin(f * 0.1)) * 10, 22, '#ffe14d');
    } else if (c > 130 && c < 280) Art.speech(ctx, E.dadTo + 30, E.floor - 150, '¡Gracias, hijo! ¡Te quiero!');

    for (const p of this.particles) Art.particle(ctx, p);

    if (c > 150) {
      Art.text(ctx, '¡HAS SALVADO A PAPÁ!', cx, 70, 42, '#ffe14d', 'center', '#e63946');
      Art.text(ctx, 'Has vencido a todos los monstruos, incluso en el infierno. ¡Eres el mejor ninja!', cx, 118, 19, '#ffffff');
      Art.text(ctx, 'Puntos: ' + this.score, cx, 152, 22, '#ffe14d');
    }
    if (c > 320 && this.blink()) Art.text(ctx, 'FIN  ·  Pulsa ENTER para volver al inicio', cx, VIEW_H - 22, 18, '#ffffff');
  }
}

// Posiciones de las escenas finales (en píxeles de pantalla)
const LOCK_HITS = 3;
const ENDING = { floor: 470, ninjaTo: 480, cageX: 640, lockX: 558, lockY: 400, dadFrom: 612, dadTo: 505, momFrom: 676, momTo: 572, dadLie: 400 };
