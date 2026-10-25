# Viaje Ninja — guía para Claude

Juego de plataformas 2D (tipo Mario) para navegador, protagonista ninja, **público: niños desde 6 años**.
Requisitos originales del cliente: [prompt_incial.md](prompt_incial.md). Manual de usuario: [README.md](README.md).

## Stack y restricciones

- HTML5 Canvas + JavaScript puro (ES2020), **sin dependencias, sin build, sin módulos**.
- Se abre con doble clic en `index.html` (`file://`). No usar `import`/`fetch`: rompería `file://`.
- Scripts clásicos cargados en orden en `index.html`; todo vive en el ámbito global. Si añades un archivo, añádelo a `index.html` **y** a las listas de `tools/sim.js` y `tools/shot.sh`.
- Sin imágenes ni audio: gráficos dibujados con formas (`art.js` + `art-extra.js`), sonido sintetizado con WebAudio (`audio.js`).
- Código, comentarios y textos del juego en **español**. `'use strict'` en cada archivo.
- Resolución lógica fija 960×544 (17 filas de casillas de 32 px); `main.js` escala el canvas con CSS.
- Paso fijo de 60 fps (`FRAME_MS`); toda la lógica cuenta en frames, no en ms.

## Arquitectura (orden de carga)

| Archivo | Contenido |
|---|---|
| `js/config.js` | Constantes: `TILE`, `ROWS`, `VIEW_W/H`, `GROUND_ROW=14`, `PHYS`, `T` (tipos de casilla), `WEAPONS`/`WEAPON_ORDER` (7 armas; `element`/`freeze`/`shot` en las espadas elementales), `ARMORS`/`ARMOR_ORDER`, `LAVA_THEMES`, `clamp` |
| `js/audio.js` | `Sound` (efectos `Sound.play(nombre)`, música `Sound.playMusic(clave de SONGS)`). Se inicia en el primer gesto del usuario |
| `js/input.js` | `Input`: `keymap` código→acciones, `down(a)`, `pressed(a)` (flanco), pulsos táctiles. `endFrame()` tras cada `update` |
| `js/physics.js` | `tileAt`, `isSolid`, `overlap`, `moveAndCollide` (AABB vs casillas; `PLATFORM` solo se pisa desde arriba; con `e.lavaWalk` el líquido se pisa), `groundAhead` |
| `js/entities.js` | `Player`, `Projectile` (+`PROJ_SIZE`, `UNBREAKABLE`; `updateGround` para bomba/bola de nieve/tornado), `Particle`, `Item`, `Checkpoint`, `MovingPlatform`, `FallingPlatform`, `FireJet`, `Crusher`, `FriendDragon`, `Portal` |
| `js/enemies.js` | `ENEMY_TYPES` (tamaño, vida, IA) y `Enemy` con IAs: walker, pouncer, charger, flyer, mosquito, dangler, shooterFlyer, hopper. `weak` = elemento que le hace doble daño; `frozen` = congelado |
| `js/bosses.js` | `BOSS_TYPES` y `Boss` (máquina de estados por jefe: `updateHeavy`, `updateDragon`, `updateKnight`, `updateWitch`, `updateIce`, `updateLava`; invoca ayudantes bajo 60% vida). `ghost` = intocable; `BOSS_HARMLESS` = estados en que tocarlo no daña |
| `js/levels.js` | `LevelBuilder` (API en casillas) y `WORLDS` (nombre, build, canción, jefe, consejo) |
| `js/art.js` | `Art`: fondos con paralaje, casillas por tema, ninja, enemigos, jefes, objetos, HUD helpers. `TILESET` por tema (mundos 1-3) |
| `js/art-extra.js` | Amplía `Art`/`TILESET` con `Object.assign`: temas `beach`/`ice`/`volcano` (`EXTRA_THEMES`), escorpión, monstruito, jefes 4-6 (`bossX`), proyectiles nuevos (`projectileX`), escudo, espadas elementales, vida extra y escena final (`dungeon`, `cage`, `parent`, `speech`) |
| `js/game.js` | `Game`: estados, carga de mundos, colisiones de juego, cámara, HUD, overlays, guardado (`localStorage` clave `viajeNinja.save`) |
| `js/main.js` | Arranque, escalado, bucle con acumulador. `window.game` para depurar |

### Estados de `Game`
`title → intro → playing ⇄ paused`, `playing → dying → playing | gameover`, `playing → levelclear → intro (siguiente) | ending → title`. `ending` es la escena del rescate de la familia: el jugador maneja al ninja (`this.end`, coordenadas de pantalla) y abre la jaula golpeando o disparando al candado `LOCK_HITS` veces (`hitLock`); luego la animación sigue por `end.open` (frames desde la apertura). Posiciones en `ENDING`.

### Contrato que usan las entidades (`g` = Game)
`g.level, g.player, g.enemies, g.projectiles, g.particles, g.items, g.camX, g.state, g.shake`,
`g.say(título, sub)`, `g.floatText`, `g.puff`, `g.sparks`, `g.dust`, `g.explosion`, `g.addScore`, `g.dropItem`,
`g.nearestTarget`, `g.onScreen`, `g.playerDie`, `g.openPortal`, `g.onBossDefeated`, `g.clearHelpers`,
`g.selectWeapon`, `g.cycleWeapon`, `g.cycleArmor`, `g.throwDiamond`, `g.bombExplode`, `g.weaponHit`.

### Reglas de juego clave
- Pisar a un enemigo normal lo mata de un golpe; pisar al jefe quita 2. `stomp` = cae (`vy>0.5`) y `prevBottom` estaba sobre la parte alta.
- Mosquito (`lethal`) mata al instante si no se le pisa, salvo con poción (`inv.pocion`, objeto `pocion`, una por mundo antes del primer mosquito): salva de una picadura y se gasta.
- Daño: primero gasta escudo de armadura (`shield`, se regenera), luego corazones. `immune: 'fire'|'ice'` anula ese elemento.
- Caer a agujero/agua/lava: −1 corazón y vuelve a `lastSafe`. Morir: −1 vida y vuelve al último checkpoint (los checkpoints rellenan corazones).
- Arena del jefe: al pasar `arenaStart+2` se cierra un muro en la columna `arenaStart` y la cámara se fija. Las arenas miden 30 casillas (= 960 px). Si mueres, el muro se abre y el jefe conserva su vida (`bossHpSaved`).
- El jefe suelta el diamante → se lanza con X → portal → `levelClear()` (guarda progreso).
- Objetos de armas/armaduras ya poseídas no se vuelven a generar.
- Inventario `inv = { weapons, weapon, armors, armor, escudo }`. Objetos sueltos: `coin`, `heart`, `pocion`, `life` (vida extra, en un escondite de cada mundo), `escudo`, `diamond`, `weapon:id`, `armor:id`.
- Espadas elementales: además del tajo lanzan `W.shot` (fuego → `flame`, hielo → `iceRay`, que congela); los proyectiles con `element` pasan por `weaponHit`. Doble daño si `enemigo.d.weak === W.element` (también jefes con `BOSS_TYPES[].weak`); la de hielo congela (`frozen`) a enemigos no `fiery`. Congelados no hacen daño.
- Escudo: anula daño de elemento `'bomb'` y `'lava'`, y en `LAVA_THEMES` permite andar sobre la lava (`player.lavaWalk`).
- Mundo `ice`: el suelo resbala (aceleración y fricción reducidas en `Player.update`).
- Una armadura por mundo: metal, roca, fuego, diamante, hielo, dorada (mundos 1-6).

## Diseñar niveles (`js/levels.js`)
- Coordenadas en casillas. Suelo normal en fila 14 (`b.ground(x0, x1)`); enemigo de suelo en fila 13 = de pie en el suelo.
- Salto ≈ 3,7 casillas de alto; con doble salto ≈ 7. Huecos ≤ 4 casillas para que sean cómodos para niños.
- Agua/lava: `b.liquid(x0, x1)` en un hueco **sin** `ground`. Plataformas móviles con estilo `'dragon'` = dragón amigo.
- Ancho del nivel ≥ `arenaStart + 32`; poner `b.block(width-2, 0, 2, 14)` como pared final.
- Para nuevas armaduras/armas: añadir en `config.js` y colocar con `b.item('armor:id' | 'weapon:id', x, y)`.

## Añadir cosas
- **Enemigo**: entrada en `ENEMY_TYPES` (reutiliza una IA) + caso en `Art.enemy` (para cuadrúpedos basta `Art.quad` con colores).
- **Jefe**: entrada en `BOSS_TYPES`, método `updateX` en `Boss` (+ rama en `Boss.update`), dibujo en `Art.bossX` (art-extra), y `b.boss('id', x)` + `WORLDS[].boss`. Si es volador, inicializa `y` fuera de pantalla en el constructor.
- **Mundo**: función `buildX()` + entrada en `WORLDS`, `TILESET[tema]` y casillas (`tGroundX`… en art-extra, añadir el tema a `EXTRA_THEMES`), fondo en `Art.background`, canción en `SONGS`. Si su líquido es lava, añadir a `LAVA_THEMES`. El final se lanza al superar el último de `WORLDS`.
- **Proyectil**: tamaño en `PROJ_SIZE`, dibujo en `Art.projectileX`; colisiones en `Game.updatePlay`. Si no se debe poder romper, añadir a `UNBREAKABLE`.

## Verificar cambios (hacerlo siempre)
1. `node tools/sim.js` — carga todo en Node con canvas falso y un bot recorre los 6 mundos (modo trampa: invencible). Debe terminar con todos los mundos `SUPERADO` y salir con código 0. Detecta excepciones en update y draw.
   `node tools/sim.js --fair` sin trampas (el bot es torpe: no sabe esperar a que bajen los jefes voladores; muertes solo orientativas).
   El canvas falso es un `Proxy` que devuelve funciones vacías; si usas un método de canvas que devuelve un valor (como `measureText`), añádelo al mock.
2. `tools/shot.sh salida.png "<js>"` — captura real con Chrome headless para revisar visualmente (leer el PNG). Ver ejemplos en el propio script.
3. Abrir `index.html` en el navegador para probar el control a mano.

## Pendiente / ideas
- Ajuste fino de dificultad con niños reales.
- Botones táctiles: no hay botón para elegir arma directamente (solo ciclar con ⚔).
- No es repositorio git todavía.
