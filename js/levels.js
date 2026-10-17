'use strict';
// ============================================================
//  Niveles / mundos
//  Coordenadas en casillas (32 px). Fila 14 = suelo normal.
//  Un enemigo de suelo en fila 13 está de pie sobre el suelo.
// ============================================================

class LevelBuilder {
  constructor(width, theme) {
    this.width = width;
    this.theme = theme;
    this.tiles = new Uint8Array(width * ROWS);
    this.spawns = [];
    this.start = { x: 2, y: GROUND_ROW - 1 };
    this.arenaStart = null;
  }
  set(x, y, t) { if (x >= 0 && x < this.width && y >= 0 && y < ROWS) this.tiles[y * this.width + x] = t; }
  fill(x0, y0, x1, y1, t) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, t); }

  ground(x0, x1, top = GROUND_ROW) { this.fill(x0, top, x1, ROWS - 1, T.GROUND); }
  block(x, y, w = 1, h = 1) { this.fill(x, y, x + w - 1, y + h - 1, T.BLOCK); }
  plat(x, y, w) { this.fill(x, y, x + w - 1, y, T.PLATFORM); }
  spikes(x0, x1, row = GROUND_ROW - 1) { this.fill(x0, row, x1, row, T.SPIKES); }
  liquid(x0, x1) { this.fill(x0, 15, x1, ROWS - 1, T.LIQUID); }

  coins(x, y, n) { for (let i = 0; i < n; i++) this.item('coin', x + i, y); }
  arc(x, y, n) { for (let i = 0; i < n; i++) this.item('coin', x + i, y - Math.round(Math.sin(i / Math.max(1, n - 1) * Math.PI) * 2)); }
  item(kind, x, y) { this.spawns.push({ type: 'item', kind, x, y }); }
  enemy(kind, x, y, opts) { this.spawns.push({ type: 'enemy', kind, x, y, opts: opts || {} }); }
  checkpoint(x, row = GROUND_ROW - 1) { this.spawns.push({ type: 'checkpoint', x, y: row }); }
  moving(x1, y1, x2, y2, w, speed, style) { this.spawns.push({ type: 'moving', x1, y1, x2, y2, w, speed, style }); }
  falling(x, y, w) { this.spawns.push({ type: 'falling', x, y, w }); }
  jet(x, row = GROUND_ROW, phase = 0) { this.spawns.push({ type: 'jet', x, row, phase }); }
  crusher(x, y) { this.spawns.push({ type: 'crusher', x, y }); }
  friend(x, y) { this.spawns.push({ type: 'friend', x, y }); }
  arena(x) { this.arenaStart = x; }
  boss(kind, x) { this.spawns.push({ type: 'boss', kind, x }); }

  build() {
    return { width: this.width, theme: this.theme, tiles: this.tiles, spawns: this.spawns, start: this.start, arenaStart: this.arenaStart };
  }
}

// ------------------------------------------------------------
//  MUNDO 1 · La ciudad
//  Animales: lobo, murciélago, mosquito, guepardo
//  Arma: espada · Armadura: metal · Vida extra escondida en la azotea
// ------------------------------------------------------------
function buildCity() {
  const b = new LevelBuilder(208, 'city');
  b.ground(0, 30);
  b.arc(5, 12, 5);
  b.plat(11, 11, 4); b.coins(11, 10, 4);
  b.block(18, 12, 2, 2);
  b.enemy('lobo', 25, 13);

  // primer hueco
  b.arc(30, 11, 5);
  b.ground(34, 86);
  b.block(38, 12, 3, 2);
  b.block(42, 10, 4, 4);
  b.coins(42, 9, 4);
  b.enemy('murcielago', 49, 9);
  b.enemy('miniMetal', 53, 13);
  b.item('weapon:espada', 58, 12);
  b.checkpoint(61);

  // pinchos
  b.spikes(68, 71);
  b.plat(67, 11, 6); b.coins(67, 10, 6);
  b.enemy('mosquito', 77, 8);
  b.enemy('lobo', 82, 13);

  // plataforma móvil sobre el vacío
  b.moving(87, 12, 92, 12, 3, 0.02);
  b.coins(88, 10, 6);
  b.ground(95, 122);
  b.block(98, 12, 2, 2);
  b.block(100, 9, 4, 5);
  // azotea secreta con una vida extra
  b.plat(105, 6, 3);
  b.plat(101, 3, 3);
  b.item('life', 102, 2);
  b.coins(105, 5, 3);
  b.enemy('guepardo', 112, 13);
  b.plat(115, 11, 3);
  b.item('armor:metal', 116, 10);
  b.checkpoint(121);

  // tejados
  b.ground(125, 132, 12);
  b.ground(135, 142, 11);
  b.ground(146, 153, 13);
  b.ground(156, 160, 11);
  b.arc(122, 10, 3); b.arc(133, 9, 2); b.arc(143, 9, 3);
  b.enemy('lobo', 129, 11);
  b.enemy('murcielago', 138, 7);
  b.enemy('miniMetal', 149, 12);
  b.jet(151, 13, 60);
  b.enemy('mosquito', 158, 6);

  // plataformas que se caen
  b.falling(162, 12, 2);
  b.falling(165, 11, 2);
  b.coins(162, 10, 6);
  b.ground(169, 207);
  b.checkpoint(172);

  // arena del jefe
  b.arena(176);
  b.block(206, 0, 2, 14);
  b.boss('heavyMetal', 198);
  return b.build();
}

// ------------------------------------------------------------
//  MUNDO 2 · El bosque de los dragones
//  Animales: tigre, pitón, araña, hipopótamo, mosquito
//  Dragones buenos: uno te acompaña y otro te lleva sobre el río
//  Armas: lunchacos y estrellas · Armadura: roca · Vida extra en las ramas
// ------------------------------------------------------------
function buildForest() {
  const b = new LevelBuilder(228, 'forest');
  b.ground(0, 22);
  b.arc(5, 12, 4);
  b.plat(9, 11, 3); b.plat(13, 8, 3); b.coins(13, 7, 3);
  b.enemy('piton', 18, 13);

  b.liquid(23, 27);
  b.moving(23, 12, 26, 12, 2, 0.025);
  b.ground(28, 60);
  b.enemy('tigre', 35, 13);
  b.item('weapon:lunchacos', 40, 12);
  b.block(44, 12, 2, 2); b.block(46, 10, 2, 4);
  b.coins(46, 9, 2);
  b.enemy('arana', 51, 6, { floorRow: 14 });
  b.friend(54, 12);
  b.enemy('mosquito', 58, 7);
  b.checkpoint(59);

  // el río: un dragón bueno te cruza
  b.liquid(61, 74);
  b.moving(61, 12, 70, 12, 4, 0.012, 'dragon');
  b.coins(63, 10, 9);
  b.ground(75, 100);
  b.enemy('hipopotamo', 81, 13);
  b.jet(86, 14, 0);
  b.jet(89, 14, 70);
  b.enemy('dragoncito', 92, 7);
  b.plat(94, 11, 3); b.plat(97, 8, 3); b.coins(97, 7, 3);
  b.enemy('piton', 98, 13);

  // puente de troncos que se caen
  b.liquid(101, 110);
  b.falling(102, 12, 2); b.falling(105, 12, 2); b.falling(108, 12, 2);
  b.ground(111, 160);
  b.item('weapon:estrellas', 114, 12);
  b.checkpoint(117);
  b.enemy('tigre', 124, 13);
  b.enemy('mosquito', 128, 8);
  b.enemy('arana', 132, 5, { floorRow: 14 });
  b.block(135, 11, 3, 3);
  // ramas secretas con una vida extra
  b.plat(138, 8, 2); b.plat(141, 5, 3);
  b.item('life', 142, 4);
  b.spikes(145, 147);
  b.enemy('dragoncito', 150, 6);
  b.enemy('hipopotamo', 154, 13);
  b.item('armor:roca', 158, 12);

  // copas de los árboles sobre el agua
  b.liquid(161, 186);
  b.ground(165, 168, 11);
  b.ground(172, 175, 10);
  b.ground(179, 182, 12);
  b.arc(161, 9, 4); b.arc(169, 8, 3); b.arc(176, 8, 3); b.arc(183, 9, 4);
  b.enemy('mosquito', 170, 6);
  b.jet(174, 10, 30);
  b.enemy('dragoncito', 178, 5);
  b.ground(187, 227);
  b.enemy('tigre', 190, 13);
  b.checkpoint(193);

  b.arena(196);
  b.block(226, 0, 2, 14);
  b.boss('dobleDragon', 211);
  return b.build();
}

// ------------------------------------------------------------
//  MUNDO 3 · El reino de los castillos
//  Animales: lobo, león, guepardo, rinoceronte, murciélago,
//            tigre, araña, mosquito
//  Arma: arco · Armadura: fuego · Vida extra en lo alto de la torre
// ------------------------------------------------------------
function buildCastle() {
  const b = new LevelBuilder(248, 'castle');
  b.ground(0, 26);
  b.item('weapon:arco', 8, 12);
  b.enemy('lobo', 16, 13);
  b.block(20, 11, 3, 3); b.coins(20, 10, 3);

  b.liquid(27, 31);
  b.moving(27, 12, 30, 12, 2, 0.03);
  b.ground(32, 90);
  b.enemy('caballerito', 38, 13);
  b.crusher(44, 4);
  b.enemy('murcielago', 49, 8);
  b.enemy('guepardo', 55, 13);
  b.checkpoint(60);
  b.spikes(64, 66);
  b.plat(63, 11, 5); b.coins(63, 10, 5);
  b.enemy('leon', 72, 13);
  b.crusher(78, 4); b.crusher(82, 4);
  b.enemy('arana', 87, 5, { floorRow: 14 });

  // foso de lava con columnas
  b.liquid(91, 102);
  b.ground(93, 95, 12);
  b.ground(98, 100, 11);
  b.arc(91, 10, 2); b.arc(96, 9, 2); b.arc(101, 9, 2);
  b.enemy('murcielago', 97, 6);
  b.ground(103, 170);
  b.checkpoint(107);
  b.enemy('rinoceronte', 114, 13);

  // torre con una vida extra en lo alto
  b.block(122, 12, 2, 2); b.block(124, 10, 2, 4); b.block(126, 8, 2, 6);
  b.plat(129, 5, 3);
  b.plat(125, 2, 3);
  b.item('life', 126, 1);
  b.jet(131, 14, 40);
  b.enemy('caballerito', 134, 13);
  b.enemy('tigre', 138, 13);
  b.checkpoint(141);
  b.item('armor:fuego', 145, 12);
  b.enemy('murcielago', 150, 8);
  b.enemy('mosquito', 154, 8);
  b.crusher(158, 4); b.crusher(161, 4);
  b.enemy('leon', 166, 13);

  // lava con plataformas que se caen
  b.liquid(171, 182);
  b.falling(172, 12, 2); b.falling(175, 11, 2); b.falling(178, 12, 2);
  b.coins(172, 10, 8);
  b.ground(183, 247);
  b.enemy('guepardo', 190, 13);
  b.enemy('caballerito', 196, 13);
  b.enemy('mosquito', 200, 8);
  b.enemy('rinoceronte', 206, 13);
  b.checkpoint(212);

  b.arena(216);
  b.block(246, 0, 2, 14);
  b.boss('caballeroOscuro', 236);
  return b.build();
}

// ------------------------------------------------------------
//  MUNDO 4 · La playa
//  Animales: escorpión, pitón, guepardo, hipopótamo, mosquito
//  Arma: espada de hielo · Armadura: diamante · Vida extra en el acantilado
// ------------------------------------------------------------
function buildBeach() {
  const b = new LevelBuilder(228, 'beach');
  b.ground(0, 24);
  b.arc(5, 12, 4);
  b.plat(9, 11, 3); b.coins(9, 10, 3);
  b.enemy('escorpion', 16, 13);
  b.block(20, 12, 2, 2);

  // el mar: una balsa te cruza
  b.liquid(25, 30);
  b.moving(25, 12, 29, 12, 2, 0.025);
  b.ground(31, 70);
  b.enemy('piton', 36, 13);
  b.item('weapon:espadaHielo', 41, 12);
  b.enemy('mosquito', 46, 8);
  // dunas
  b.ground(48, 52, 13); b.ground(53, 56, 12); b.ground(57, 60, 13);
  b.arc(52, 10, 6);
  b.enemy('escorpion', 54, 11);
  b.checkpoint(64);
  b.enemy('guepardo', 68, 13);

  // mar abierto con dos balsas
  b.liquid(71, 84);
  b.moving(71, 12, 75, 12, 2, 0.02);
  b.moving(77, 11, 82, 11, 2, 0.022);
  b.coins(73, 9, 9);
  b.ground(85, 130);
  b.enemy('hipopotamo', 90, 13);
  b.block(95, 12, 2, 2); b.block(97, 10, 2, 4);
  // acantilado secreto con una vida extra
  b.plat(100, 7, 3); b.plat(96, 4, 3);
  b.item('life', 97, 3);
  b.coins(100, 6, 3);
  b.enemy('escorpion', 104, 13);
  b.enemy('mosquito', 108, 8);
  b.item('armor:diamante', 112, 12);
  b.checkpoint(115);
  b.spikes(119, 121); // erizos de mar
  b.plat(118, 11, 5); b.coins(118, 10, 5);
  b.enemy('piton', 125, 13);

  // rocas que se hunden en el agua
  b.liquid(131, 142);
  b.falling(132, 12, 2); b.falling(135, 11, 2); b.falling(138, 12, 2);
  b.coins(132, 10, 8);
  b.ground(143, 227);
  b.enemy('guepardo', 150, 13);
  b.enemy('escorpion', 156, 13);
  b.enemy('mosquito', 160, 7);
  b.ground(164, 168, 12);
  b.arc(163, 10, 7);
  b.enemy('hipopotamo', 174, 13);
  b.enemy('escorpion', 180, 13);
  b.checkpoint(186);

  b.arena(196);
  b.block(226, 0, 2, 14);
  b.boss('witchSand', 214);
  return b.build();
}

// ------------------------------------------------------------
//  MUNDO 5 · El mundo de hielo (¡el suelo resbala!)
//  Animales: lobo, oso polar, murciélago, araña
//  Arma: espada de fuego · Armadura: hielo · Vida extra en el iceberg
// ------------------------------------------------------------
function buildIce() {
  const b = new LevelBuilder(228, 'ice');
  b.ground(0, 26);
  b.arc(5, 12, 4);
  b.enemy('lobo', 14, 13);
  b.plat(17, 11, 3); b.coins(17, 10, 3);
  b.block(22, 12, 2, 2);

  b.liquid(27, 31);
  b.moving(27, 12, 30, 12, 2, 0.03);
  b.ground(32, 74);
  b.enemy('osoPolar', 40, 13);
  b.item('weapon:espadaFuego', 46, 12);
  b.enemy('murcielago', 50, 8);
  b.block(53, 11, 3, 3); b.coins(53, 10, 3);
  // iceberg secreto con una vida extra
  b.plat(57, 8, 2); b.plat(59, 5, 3);
  b.item('life', 60, 4);
  b.jet(63, 14, 0);
  b.enemy('lobo', 67, 13);
  b.checkpoint(71);

  // agua helada: témpano que se mueve y témpanos que se rompen
  b.liquid(75, 88);
  b.moving(75, 12, 79, 12, 2, 0.02);
  b.falling(82, 11, 2); b.falling(85, 12, 2);
  b.coins(76, 9, 12);
  b.ground(89, 140);
  b.enemy('osoPolar', 95, 13);
  b.enemy('arana', 100, 5, { floorRow: 14 });
  b.item('armor:hielo', 104, 12);
  b.checkpoint(108);
  // escalones de hielo
  b.ground(112, 115, 12); b.ground(116, 119, 10); b.ground(120, 123, 12);
  b.arc(115, 8, 6);
  b.enemy('lobo', 117, 9);
  b.enemy('murcielago', 126, 7);
  b.jet(130, 14, 60);
  b.enemy('osoPolar', 135, 13);

  b.liquid(141, 152);
  b.moving(141, 11, 148, 11, 3, 0.015);
  b.coins(142, 9, 9);
  b.ground(153, 227);
  b.enemy('lobo', 160, 13);
  b.enemy('murcielago', 166, 8);
  b.enemy('osoPolar', 172, 13);
  b.enemy('arana', 178, 5, { floorRow: 14 });
  b.checkpoint(186);

  b.arena(196);
  b.block(226, 0, 2, 14);
  b.boss('iceKill', 214);
  return b.build();
}

// ------------------------------------------------------------
//  MUNDO 6 · El volcán
//  Animales: monstruitos de fuego, murciélago, rinoceronte, araña,
//            tigre, guepardo
//  Objeto: escudo (al principio) · Armadura: dorada · Vida extra en la roca
// ------------------------------------------------------------
function buildVolcano() {
  const b = new LevelBuilder(228, 'volcano');
  b.ground(0, 30);
  b.item('escudo', 6, 12);
  b.arc(10, 12, 4);
  b.enemy('monstruitoFuego', 18, 13);
  b.block(24, 12, 2, 2);

  // primer lago de lava (con el escudo se puede cruzar andando)
  b.liquid(31, 38);
  b.falling(32, 12, 2); b.falling(35, 12, 2);
  b.coins(32, 10, 6);
  b.ground(39, 80);
  b.enemy('murcielago', 44, 8);
  b.jet(48, 14, 0); b.jet(52, 14, 70);
  b.enemy('monstruitoFuego', 56, 13);
  b.item('armor:dorada', 60, 12);
  b.checkpoint(63);
  b.crusher(68, 4);
  b.enemy('rinoceronte', 74, 13);

  // río de lava con islas
  b.liquid(81, 96);
  b.ground(85, 86, 12); b.ground(91, 92, 11);
  b.arc(83, 10, 3); b.arc(88, 9, 3); b.arc(93, 9, 3);
  b.ground(97, 150);
  b.enemy('tigre', 103, 13);
  b.enemy('arana', 108, 5, { floorRow: 14 });
  b.block(112, 12, 2, 2); b.block(114, 10, 2, 4);
  // roca secreta con una vida extra
  b.plat(117, 7, 3); b.plat(113, 4, 3);
  b.item('life', 114, 3);
  b.coins(117, 6, 3);
  b.enemy('monstruitoFuego', 120, 13);
  b.checkpoint(124);
  b.crusher(128, 4); b.crusher(132, 4);
  b.enemy('guepardo', 138, 13);
  b.jet(144, 14, 30);
  b.enemy('murcielago', 147, 8);

  b.liquid(151, 164);
  b.moving(151, 12, 160, 12, 2, 0.02);
  b.coins(152, 10, 10);
  b.ground(165, 227);
  b.enemy('rinoceronte', 172, 13);
  b.enemy('monstruitoFuego', 178, 13);
  b.enemy('monstruitoFuego', 182, 13);
  b.checkpoint(188);

  b.arena(196);
  b.block(226, 0, 2, 14);
  b.boss('llamarada', 214);
  return b.build();
}

const WORLDS = [
  { name: 'Mundo 1: La Ciudad', short: 'Mundo 1', build: buildCity, song: 'city', boss: 'heavyMetal',
    tip: 'Salta encima de los enemigos o usa tu bastón. ¡Cuidado con los mosquitos!' },
  { name: 'Mundo 2: El Bosque de los Dragones', short: 'Mundo 2', build: buildForest, song: 'forest', boss: 'dobleDragon',
    tip: 'Los dragones verdes son tus amigos. La armadura de fuego te protege del fuego.' },
  { name: 'Mundo 3: El Reino de los Castillos', short: 'Mundo 3', build: buildCastle, song: 'castle', boss: 'caballeroOscuro',
    tip: 'Usa el arco desde lejos. Cuando el caballero se marea, ¡ataca!' },
  { name: 'Mundo 4: La Playa', short: 'Mundo 4', build: buildBeach, song: 'beach', boss: 'witchSand',
    tip: 'Salta los tornados de arena. ¡La espada de hielo congela a los enemigos!' },
  { name: 'Mundo 5: El Mundo de Hielo', short: 'Mundo 5', build: buildIce, song: 'ice', boss: 'iceKill',
    tip: '¡El hielo resbala! La espada de fuego hace mucho daño a los monstruos de hielo.' },
  { name: 'Mundo 6: El Volcán', short: 'Mundo 6', build: buildVolcano, song: 'volcano', boss: 'llamarada',
    tip: 'Coge el escudo: te protege de las bombas y puedes andar sobre la lava.' },
];
