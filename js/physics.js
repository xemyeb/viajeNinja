'use strict';
// ============================================================
//  Colisiones con el mapa de casillas
// ============================================================
function tileAt(level, col, row) {
  if (col < 0 || col >= level.width) return T.GROUND; // bordes del nivel = pared
  if (row < 0 || row >= (level.rows || ROWS)) return T.EMPTY;
  return level.tiles[row * level.width + col];
}

// Borde inferior del nivel en píxeles (los niveles altos, como el descenso, tienen más filas)
function levelBottom(level) { return (level.rows || ROWS) * TILE; }

function isSolid(t) { return t === T.GROUND || t === T.BLOCK; }

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Mueve una entidad (x, y, w, h, vx, vy) y la frena contra las casillas sólidas.
// Las plataformas (T.PLATFORM) solo se pisan desde arriba.
// Con e.lavaWalk (escudo en mundos de lava) la superficie del líquido también se pisa.
function moveAndCollide(e, level, dropThrough = false) {
  e.hitWall = false;
  e.hitHead = false;

  // --- eje X ---
  e.x += e.vx;
  const top = Math.floor(e.y / TILE);
  const bot = Math.floor((e.y + e.h - 1) / TILE);
  if (e.vx > 0) {
    const col = Math.floor((e.x + e.w - 0.01) / TILE);
    for (let r = top; r <= bot; r++) {
      if (isSolid(tileAt(level, col, r))) { e.x = col * TILE - e.w; e.vx = 0; e.hitWall = true; break; }
    }
  } else if (e.vx < 0) {
    const col = Math.floor(e.x / TILE);
    for (let r = top; r <= bot; r++) {
      if (isSolid(tileAt(level, col, r))) { e.x = (col + 1) * TILE; e.vx = 0; e.hitWall = true; break; }
    }
  }

  // --- eje Y ---
  const prevBottom = e.y + e.h;
  e.y += e.vy;
  e.onGround = false;
  const left = Math.floor(e.x / TILE);
  const right = Math.floor((e.x + e.w - 0.01) / TILE);
  if (e.vy > 0) {
    const row = Math.floor((e.y + e.h - 0.01) / TILE);
    for (let c = left; c <= right; c++) {
      const t = tileAt(level, c, row);
      if (isSolid(t) || (t === T.PLATFORM && !dropThrough && prevBottom <= row * TILE + 0.5) ||
          (t === T.LIQUID && e.lavaWalk && prevBottom <= row * TILE + 8)) {
        e.y = row * TILE - e.h; e.vy = 0; e.onGround = true; break;
      }
    }
  } else if (e.vy < 0) {
    const row = Math.floor(e.y / TILE);
    for (let c = left; c <= right; c++) {
      if (isSolid(tileAt(level, c, row))) { e.y = (row + 1) * TILE; e.vy = 0; e.hitHead = true; break; }
    }
  }
}

// ¿Hay suelo delante? (para que los enemigos no se caigan por los bordes)
function groundAhead(e, level, dir) {
  const col = Math.floor((dir > 0 ? e.x + e.w + 2 : e.x - 2) / TILE);
  const row = Math.floor((e.y + e.h + 2) / TILE);
  const t = tileAt(level, col, row);
  return isSolid(t) || t === T.PLATFORM;
}
