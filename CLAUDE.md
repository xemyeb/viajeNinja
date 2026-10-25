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
| `js/config.js` | Constantes: `TILE`, `ROWS`, `VIEW_W/H`, `GROUND_ROW=14`, `PHYS`, `T` (tipos de casilla), `WEAPONS`/`WEAPON_ORDER` (8 armas; `element`/`freeze`/`shot` en las espadas especiales, `fly` en la láser), `FLY` (vuelo), `BOSS_SHIELD_HITS`, `ARMORS`/`ARMOR_ORDER`, `LAVA_THEMES` (lava que se pisa con escudo), `LAVA_LOOK` (dibujo de lava, incluye `hell`), `clamp` |
| `js/audio.js` | `Sound` (efectos `Sound.play(nombre)`, música `Sound.playMusic(clave de SONGS)`). Se inicia en el primer gesto del usuario |
| `js/input.js` | `Input`: `keymap` código→acciones, `down(a)`, `pressed(a)` (flanco), pulsos táctiles. `endFrame()` tras cada `update` |
| `js/physics.js` | `tileAt` (usa `level.rows`), `levelBottom`, `isSolid`, `overlap`, `moveAndCollide` (AABB vs casillas; `PLATFORM` solo se pisa desde arriba; con `e.lavaWalk` el líquido se pisa), `groundAhead` |
| `js/entities.js` | `Player` (vuelo: `flyE`/`flying`), `Projectile` (+`PROJ_SIZE`, `UNBREAKABLE`; `updateGround` para bomba/bola de nieve/tornado), `Particle`, `Item`, `Checkpoint`, `MovingPlatform`, `FallingPlatform`, `FireJet`, `Crusher`, `FriendDragon`, `Portal`. Obstáculos especiales: `Spring` (trampolín/seta/géiser), `Dropper` (carámbano/coco/roca/meteorito), `FireBar`, `Wind` (empuje `fx`, aire caliente `fy`, rachas `gust`), `BlinkPlatform` |
| `js/enemies.js` | `ENEMY_TYPES` (tamaño, vida, IA) y `Enemy` con IAs: walker, pouncer, charger, flyer, mosquito, dangler, shooterFlyer, hopper. `weak` = elemento que le hace doble daño; `frozen` = congelado |
| `js/bosses.js` | `BOSS_TYPES` y `Boss` (máquina de estados por jefe: `updateHeavy`, `updateDragon`, `updateKnight`, `updateWitch`, `updateIce`, `updateLava`; invoca ayudantes bajo 60% vida). `ghost` = intocable; `BOSS_HARMLESS` = estados en que tocarlo no daña |
| `js/levels.js` | `LevelBuilder` (API en casillas; `rows` para niveles altos; `exitAt` = salida a la parte 2) y `WORLDS` (nombre, build, `build2` opcional, canción, jefe, `bossRush`, `ending`, consejo) |
| `js/art.js` | `Art`: fondos con paralaje, casillas por tema, ninja, enemigos, jefes, objetos, HUD helpers. `TILESET` por tema (mundos 1-3) |
| `js/art-extra.js` | Amplía `Art`/`TILESET` con `Object.assign`: temas `beach`/`ice`/`volcano`/`hell` (`EXTRA_THEMES`), escorpión, monstruito, diablillo (`imp`), jefes 4-6 (`bossX`), proyectiles nuevos (`projectileX`), escudo, espadas, vida extra, obstáculos especiales (`spring`, `dropper`, `firebar`, `wind`, `blinkPlat`), `hellGate`, `bossShield`, `lifePotion` y escenas finales (`dungeon`, `cage`, `parent` con `fall`, `speech`) |
| `js/game.js` | `Game`: estados, carga de mundos, colisiones de juego, cámara, HUD, overlays, guardado (`localStorage` clave `viajeNinja.save`) |
| `js/main.js` | Arranque, escalado, bucle con acumulador. `window.game` para depurar |

### Estados de `Game`
`title → intro → playing ⇄ paused`, `playing → dying → playing | gameover`, `playing → levelclear → intro (siguiente) | ending`. Si `WORLDS[i].ending` existe, al superar ese mundo se lanza `startEnding(modo)`:
- `'rescue'` (tras el mundo 6): el jugador maneja al ninja (`this.end`, coordenadas de pantalla) y abre la jaula golpeando o disparando al candado `LOCK_HITS` veces (`hitLock`); la animación sigue por `end.open` (frames desde la apertura): celebración, mosquitos (`end.mosq`) que pican a papá (tumbado: `Art.parent(..., fall)`) y diálogo. ENTER → mundo 7.
- `'cure'` (tras el mundo 7): papá tumbado; el ninja se acerca y pulsa Z para darle la poción (`end.cure` = frames desde entonces). ENTER → título (borra el guardado).
Posiciones en `ENDING`.

### Mundo 7 (infierno): partes, cámara vertical y jefes seguidos
- `loadWorld(i, part, direct)`: `part 1` usa `WORLDS[i].build2`. El descenso (`buildHellDescent`, 62 filas) acaba en `level.exit`; al tocarla, `enterPart2()` carga la parte 2 sin presentación y guarda `{ world, part: 1 }`. `continueGame`/`restartWorld` respetan la parte.
- La cámara sigue en vertical cuando `level.rows > ROWS` (`camY`, `cameraTargetY`); `isActive`/`onScreen` también miran `y`. Usa `levelBottom(level)` en vez de `VIEW_H` para "se ha caído del nivel".
- `b.boss('rush', x)` + `WORLDS[].bossRush`: `startBoss` saca `bossRush[rushIndex]` con el 60% de vida; `onBossDefeated` pasa al siguiente tras `rushWait` frames (suelta un corazón) y el último suelta `pocionVida` → portal. Si mueres, el muro se abre y vuelve el mismo jefe.
- `bossHurtPlayer`: todo daño de jefe (contacto, `attackBox`, proyectiles enemigos y bombas con jefe presente) pasa por aquí; `inv.escudoJefe` para `BOSS_SHIELD_HITS` golpes.
- La espada láser está en una cueva de techo bajo para que sea imposible no cogerla (hace falta para volar sobre el gran lago de lava).

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
- Inventario `inv = { weapons, weapon, armors, armor, escudo, pocion, escudoJefe, pocionVida }`. Objetos sueltos: `coin`, `heart`, `pocion`, `life` (vida extra, en un escondite de los mundos 1-6), `escudo`, `escudoJefe`, `pocionVida`, `diamond`, `weapon:id`, `armor:id`.
- Espadas elementales: además del tajo lanzan `W.shot` (fuego → `flame`, hielo → `iceRay`, que congela); los proyectiles con `element` pasan por `weaponHit`. Doble daño si `enemigo.d.weak === W.element` (también jefes con `BOSS_TYPES[].weak`); la de hielo congela (`frozen`) a enemigos no `fiery`. Congelados no hacen daño.
- Escudo: anula daño de elemento `'bomb'` y `'lava'`, y en `LAVA_THEMES` permite andar sobre la lava (`player.lavaWalk`).
- Mundo `ice`: el suelo resbala (aceleración y fricción reducidas en `Player.update`).
- Una armadura por mundo: metal, roca, fuego, diamante, hielo, dorada (mundos 1-6).
- Espada láser: si está en `inv.weapons`, mantener el salto en el aire (tras el doble salto o cayendo) hace volar mientras quede `flyE` (se recarga en el suelo). Alas y barra «Vuelo» en el HUD.
- Pruebas especiales por mundo (que no se repitan): 1 trampolín junto a un muro de 8 casillas, 2 setas saltarinas entre espinas, 3 barras de fuego, 4 cocos + géiser junto a una roca alta, 5 ventisca a rachas + carámbanos, 6 rocas + aire caliente sobre la lava, 7 plataformas mágicas, lago que se cruza volando, meteoritos y los 6 jefes. El trampolín/géiser que sirve para subir un muro debe estar **pegado** al muro (si no, quien llega saltando se queda atascado).

## Diseñar niveles (`js/levels.js`)
- Obstáculos: `b.spring(x, fila, 'trampoline'|'mushroom'|'geyser', fase)`, `b.dropper(x, y, 'icicle'|'coconut'|'rock'|'meteor')`, `b.firebar(x, y, largo, velocidad)`, `b.wind(x0, y0, x1, y1, fx, fy, racha)`, `b.blink(x, y, ancho, fase)`.
- Coordenadas en casillas. Suelo normal en fila 14 (`b.ground(x0, x1)`); enemigo de suelo en fila 13 = de pie en el suelo.
- Salto ≈ 3,7 casillas de alto; con doble salto ≈ 7. Huecos ≤ 4 casillas para que sean cómodos para niños.
- Agua/lava: `b.liquid(x0, x1)` en un hueco **sin** `ground`. Plataformas móviles con estilo `'dragon'` = dragón amigo.
- Ancho del nivel ≥ `arenaStart + 32`; poner `b.block(width-2, 0, 2, 14)` como pared final.
- Para nuevas armaduras/armas: añadir en `config.js` y colocar con `b.item('armor:id' | 'weapon:id', x, y)`.

## Añadir cosas
- **Enemigo**: entrada en `ENEMY_TYPES` (reutiliza una IA) + caso en `Art.enemy` (para cuadrúpedos basta `Art.quad` con colores).
- **Jefe**: entrada en `BOSS_TYPES`, método `updateX` en `Boss` (+ rama en `Boss.update`), dibujo en `Art.bossX` (art-extra), y `b.boss('id', x)` + `WORLDS[].boss`. Si es volador, inicializa `y` fuera de pantalla en el constructor.
- **Mundo**: función `buildX()` + entrada en `WORLDS`, `TILESET[tema]` y casillas (`tGroundX`… en art-extra, añadir el tema a `EXTRA_THEMES`), fondo en `Art.background`, canción en `SONGS`. Si su líquido es lava, añadir a `LAVA_LOOK` (y a `LAVA_THEMES` si se puede pisar con el escudo). Las escenas finales se lanzan con `WORLDS[].ending`.
- **Proyectil**: tamaño en `PROJ_SIZE`, dibujo en `Art.projectileX`; colisiones en `Game.updatePlay`. Si no se debe poder romper, añadir a `UNBREAKABLE`.

## Verificar cambios (hacerlo siempre)
1. `node tools/sim.js` — carga todo en Node con canvas falso y un bot recorre los 7 mundos (en el 7, las dos partes; con la espada láser mantiene el salto para volar) (modo trampa: invencible). Debe terminar con los 7 mundos `SUPERADO` y salir con código 0. Detecta excepciones en update y draw.
   `node tools/sim.js --fair` sin trampas (el bot es torpe: no sabe esperar a que bajen los jefes voladores; muertes solo orientativas).
   El canvas falso es un `Proxy` que devuelve funciones vacías; si usas un método de canvas que devuelve un valor (como `measureText`), añádelo al mock.
2. `tools/shot.sh salida.png "<js>"` — captura real con Chrome headless para revisar visualmente (leer el PNG). Ver ejemplos en el propio script.
3. Abrir `index.html` en el navegador para probar el control a mano.

## Pendiente / ideas
- Ajuste fino de dificultad con niños reales.
- Botones táctiles: no hay botón para elegir arma directamente (solo ciclar con ⚔).
- No es repositorio git todavía.
