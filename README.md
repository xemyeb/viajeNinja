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
| ↑ / Espacio (o W) | Saltar (pulsa otra vez en el aire para el doble salto; con la espada láser, mantenlo pulsado para volar) |
| ↓ + salto | Bajar de una plataforma |
| Z (o J) | Atacar |
| Q / E o 1-8 | Cambiar de arma |
| C | Cambiar de armadura |
| X / K | Lanzar el diamante (abre el portal) |
| P / Esc | Pausa |
| M | Sonido sí / no |

## Historia y mundos

Los monstruos han encerrado a la familia del ninja en una mazmorra. Hay que vencer a los 6 jefes para rescatarla.

1. **La Ciudad**: el jefe es Heavy Metal (y sus Mini Metal). Arma: espada. Armadura: metal. Prueba especial: un muro altísimo que solo se sube con el **trampolín**.
2. **El Bosque de los Dragones**: el jefe es el Doble Dragón (una cabeza de fuego y otra de hielo), con dragoncitos. Hay dragones amigos. Armas: lunchacos y estrellas ninja. Armadura: roca. Prueba especial: un campo de espinas con **setas saltarinas**.
3. **El Reino de los Castillos**: el jefe es El Caballero Oscuro, con sus caballeros. Arma: arco. Armadura: fuego. Prueba especial: **barras de fuego** que giran.
4. **La Playa**: el jefe es Witch Sand, una bruja de arena que lanza tornados, con escorpiones del desierto. Arma: espada de hielo. Armadura: diamante. Pruebas especiales: **cocos** que caen de las palmeras y un **géiser** que te sube a una roca alta.
5. **El Mundo de Hielo** (¡el suelo resbala!): el jefe es Ice Kill, que lanza bolas de hielo y de nieve, con osos polares. Arma: espada de fuego. Armadura: hielo. Pruebas especiales: **ventisca** que sopla a rachas y **carámbanos** que caen.
6. **El Volcán**: el jefe es Llamarada Explosiva, que lanza fuego y bombas, con monstruitos de fuego. Objeto: escudo. Armadura: dorada. Pruebas especiales: **rocas** que caen y **aire caliente** que te eleva sobre la lava.
7. **El Infierno**: primero hay que **bajar** por escalones de roca y un pozo profundo hasta la puerta del infierno. Abajo, un mundo con pruebas nuevas: **plataformas mágicas** que aparecen y desaparecen, un **gran lago de lava** que hay que cruzar volando y una **lluvia de meteoritos**. Hay diablillos. Al final esperan **los 6 monstruos finales, uno detrás de otro** (con algo menos de vida). Arma: **espada láser**. Objetos: **escudo de los monstruos** y **poción de la vida**.

Cada mundo tiene además un escondite secreto con una **vida extra**.

Animales ayudantes de los villanos: tigres, lobos, pitones, araña gigante, mosquitos (¡su picadura elimina!), hipopótamos, leones, rinocerontes, murciélagos y guepardos.

- **Espada de fuego**: lanza llamaradas y hace doble daño a los monstruos de hielo.
- **Espada de hielo**: lanza rayos de hielo que congelan a los enemigos y hace doble daño a los monstruos de fuego.
- **Escudo**: protege de las bombas y permite andar sobre la lava.
- **Poción antimosquitos** (una en cada mundo): te salva de una picadura de mosquito y luego se gasta.
- **Armaduras y cascos**: aguantan golpes. La de fuego hace inmune al fuego y la de hielo, al hielo.
- **Espada láser** (infierno): golpe largo y dispara rayos láser. Además **puedes volar**: mantén pulsado el salto en el aire (la barra «Vuelo» se recarga al pisar el suelo).
- **Escudo de los monstruos** (infierno): para 3 golpes de los monstruos finales.
- **Poción de la vida**: la suelta el último monstruo del infierno. Con ella el ninja salva a papá.
- La lava del infierno no se puede pisar, ni con el escudo.

Al vencer al jefe, este suelta un **diamante**: cógelo y lánzalo para abrir el portal al siguiente mundo.
Tras el volcán, el ninja rescata a su familia de la mazmorra: ¡tú lo manejas y tienes que romper el candado de la jaula (3 golpes, o dispararle)!
Pero llegan unos mosquitos y pican a papá. El ninja promete a mamá viajar al infierno a por la poción que lo salvará.
Al terminar el infierno, el ninja vuelve con sus padres: acércate a papá y pulsa Z para darle la poción. ¡Papá se salva!
El progreso se guarda al completar cada mundo (y al llegar abajo del todo en el infierno).

## Código

- `js/config.js` física, armas y armaduras
- `js/levels.js` diseño de los mundos (fácil de editar: casillas de 32 px)
- `js/enemies.js` animales y esbirros · `js/bosses.js` jefes
- `js/entities.js` ninja, proyectiles, objetos y obstáculos
- `js/art.js` gráficos de los mundos 1-3 y comunes · `js/art-extra.js` mundos 4-7, obstáculos especiales, objetos nuevos y escenas finales · `js/audio.js` música y efectos (WebAudio)
- `js/game.js` estados, colisiones y HUD · `js/main.js` arranque
