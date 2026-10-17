'use strict';
// ============================================================
//  Configuración general del juego
// ============================================================
const TILE = 32;
const ROWS = 17;
const VIEW_W = 960;
const VIEW_H = ROWS * TILE; // 544
const FRAME_MS = 1000 / 60;
const GROUND_ROW = 14;

// Física pensada para niños: saltos altos y control suave.
const PHYS = {
  gravity: 0.55,
  maxFall: 12,
  runSpeed: 4.2,
  accel: 0.7,
  airAccel: 0.5,
  friction: 0.72,
  jump: -11.6,       // salto normal (~3,7 bloques)
  doubleJump: -10.6, // segundo salto en el aire
  jumpCut: -4,       // al soltar el botón antes, el salto es más corto
  coyote: 7,         // frames de margen tras salir de un borde
  jumpBuffer: 8,     // frames que se "recuerda" la pulsación de salto
};

const START_HEARTS = 5;
const START_LIVES = 5;
const INVULN_FRAMES = 100;
const SHIELD_REGEN_FRAMES = 480; // la armadura recupera 1 punto cada 8 s

// Tipos de casilla del mapa
const T = { EMPTY: 0, GROUND: 1, BLOCK: 2, PLATFORM: 3, SPIKES: 4, LIQUID: 5 };

// ------------------------------------------------------------
//  Armas
// ------------------------------------------------------------
const WEAPONS = {
  baston:    { name: 'Bastón',          type: 'melee', dmg: 1, range: 58, cooldown: 22, duration: 14 },
  espada:    { name: 'Espada',          type: 'melee', dmg: 2, range: 52, cooldown: 16, duration: 11 },
  lunchacos: { name: 'Lunchacos',       type: 'melee', dmg: 1, range: 48, cooldown: 13, duration: 14, both: true },
  estrellas: { name: 'Estrellas ninja', type: 'proj',  dmg: 1, speed: 9,  cooldown: 14, proj: 'star' },
  arco:      { name: 'Arco',            type: 'proj',  dmg: 2, speed: 11, cooldown: 26, proj: 'arrow' },
  // Espadas elementales: hacen doble daño a los enemigos débiles a su elemento.
  // La de hielo además congela a los enemigos normales un rato.
  espadaFuego: { name: 'Espada de fuego', type: 'melee', dmg: 2, range: 56, cooldown: 16, duration: 11, element: 'fire' },
  espadaHielo: { name: 'Espada de hielo', type: 'melee', dmg: 2, range: 56, cooldown: 16, duration: 11, element: 'ice', freeze: 150 },
};
const WEAPON_ORDER = ['baston', 'espada', 'lunchacos', 'estrellas', 'arco', 'espadaFuego', 'espadaHielo'];

// ------------------------------------------------------------
//  Armaduras + cascos (se consiguen juntos)
//  shield = golpes que absorben antes de perder corazones
// ------------------------------------------------------------
const ARMORS = {
  metal:    { title: 'de metal', name: 'Metal',    shield: 2, color: '#a7b1bb', dark: '#5f6b77', shine: '#eef3f7' },
  roca:     { title: 'de roca', name: 'Roca',     shield: 3, color: '#8a7763', dark: '#54473a', shine: '#c2ad95' },
  fuego:    { title: 'de fuego', name: 'Fuego',    shield: 3, color: '#ee5a24', dark: '#a8320d', shine: '#ffc048', immune: 'fire' },
  hielo:    { title: 'de hielo', name: 'Hielo',    shield: 3, color: '#7ed6f5', dark: '#3a9cc4', shine: '#f0fbff', immune: 'ice' },
  diamante: { title: 'de diamante', name: 'Diamante', shield: 4, color: '#5ce1e6', dark: '#1fa4b0', shine: '#ffffff' },
  dorada:   { title: 'dorados', name: 'Dorada',   shield: 5, color: '#f5c518', dark: '#b58a00', shine: '#fff3b0' },
};
const ARMOR_ORDER = ['metal', 'roca', 'fuego', 'hielo', 'diamante', 'dorada'];

// Temas cuyo líquido es lava (el escudo permite caminar sobre ella)
const LAVA_THEMES = new Set(['castle', 'volcano']);

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
