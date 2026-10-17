'use strict';
// ============================================================
//  Arranque: lienzo, escalado y bucle a 60 fps fijos
// ============================================================
(function () {
  const canvas = document.getElementById('game');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  function fit() {
    const touchH = document.getElementById('touch').classList.contains('hidden') ? 0 : 0;
    const s = Math.min(window.innerWidth / VIEW_W, (window.innerHeight - touchH) / VIEW_H);
    canvas.style.width = Math.floor(VIEW_W * s) + 'px';
    canvas.style.height = Math.floor(VIEW_H * s) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();

  Input.init(canvas);
  const game = new Game(canvas);
  window.game = game; // útil para depurar desde la consola

  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= FRAME_MS) {
      game.update();
      Input.endFrame();
      acc -= FRAME_MS;
    }
    game.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
