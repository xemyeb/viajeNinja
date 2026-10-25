# Viaje Ninja

Juego de plataformas 2D para el navegador (HTML5 Canvas + JavaScript, sin dependencias).
Pensado para niños a partir de 6 años.

## Jugar

Abre `index.html` en el navegador (doble clic). No hace falta servidor ni instalar nada.
En tablets y móviles aparecen botones táctiles.

## Controles

| Tecla | Acción |
|---|---|
| ← → (o A / D) | Moverse |
| ↑ / Espacio (o W) | Saltar (pulsa otra vez en el aire para el doble salto) |
| ↓ + salto | Bajar de una plataforma |
| Z (o J) | Atacar |
| Q / E o 1-7 | Cambiar de arma |
| C | Cambiar de armadura |
| X / K | Lanzar el diamante (abre el portal) |
| P / Esc | Pausa |
| M | Sonido sí / no |

## Historia y mundos

Los monstruos han encerrado a la familia del ninja en una mazmorra. Hay que vencer a los 6 jefes para rescatarla.

1. **La Ciudad**: el jefe es Heavy Metal (y sus Mini Metal). Arma: espada. Armadura: metal.
2. **El Bosque de los Dragones**: el jefe es el Doble Dragón (una cabeza de fuego y otra de hielo), con dragoncitos. Hay dragones amigos. Armas: lunchacos y estrellas ninja. Armadura: roca.
3. **El Reino de los Castillos**: el jefe es El Caballero Oscuro, con sus caballeros. Arma: arco. Armadura: fuego.
4. **La Playa**: el jefe es Witch Sand, una bruja de arena que lanza tornados, con escorpiones del desierto. Arma: espada de hielo. Armadura: diamante.
5. **El Mundo de Hielo** (¡el suelo resbala!): el jefe es Ice Kill, que lanza bolas de hielo y de nieve, con osos polares. Arma: espada de fuego. Armadura: hielo.
6. **El Volcán**: el jefe es Llamarada Explosiva, que lanza fuego y bombas, con monstruitos de fuego. Objeto: escudo. Armadura: dorada.

Cada mundo tiene además un escondite secreto con una **vida extra**.

Animales ayudantes de los villanos: tigres, lobos, pitones, araña gigante, mosquitos (¡su picadura elimina!), hipopótamos, leones, rinocerontes, murciélagos y guepardos.

- **Espada de fuego**: lanza llamaradas y hace doble daño a los monstruos de hielo.
- **Espada de hielo**: lanza rayos de hielo que congelan a los enemigos y hace doble daño a los monstruos de fuego.
- **Escudo**: protege de las bombas y permite andar sobre la lava.
- **Poción antimosquitos** (una en cada mundo): te salva de una picadura de mosquito y luego se gasta.
- **Armaduras y cascos**: aguantan golpes. La de fuego hace inmune al fuego y la de hielo, al hielo.

Al vencer al jefe, este suelta un **diamante**: cógelo y lánzalo para abrir el portal al siguiente mundo.
Al final, el ninja rescata a su familia de la mazmorra: ¡tú lo manejas y tienes que romper el candado de la jaula (3 golpes, o dispararle)!
El progreso se guarda al completar cada mundo.

## Código

- `js/config.js` física, armas y armaduras
- `js/levels.js` diseño de los mundos (fácil de editar: casillas de 32 px)
- `js/enemies.js` animales y esbirros · `js/bosses.js` jefes
- `js/entities.js` ninja, proyectiles, objetos y obstáculos
- `js/art.js` gráficos de los mundos 1-3 y comunes · `js/art-extra.js` mundos 4-6, objetos nuevos y escena final · `js/audio.js` música y efectos (WebAudio)
- `js/game.js` estados, colisiones y HUD · `js/main.js` arranque
