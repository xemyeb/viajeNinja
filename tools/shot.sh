#!/bin/bash
# Captura de pantalla real con Chrome headless.
# Uso: tools/shot.sh <salida.png> "<js de preparación>"
# El JS tiene acceso a `g` (Game) y a `step(n)` (avanza n frames). Ejemplos:
#   tools/shot.sh /tmp/boss1.png "g.loadWorld(0); g.state='playing'; g.player.x=180*32; step(200);"
#   tools/shot.sh /tmp/title.png "step(60)"
set -e
OUT="$1"; SETUP="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
{
  echo '<!doctype html><html><head><meta charset="utf-8">'
  echo "<link rel=\"stylesheet\" href=\"file://$ROOT/css/style.css\"></head><body>"
  echo '<canvas id="game"></canvas><div id="touch" class="hidden"></div>'
  for f in config audio input physics entities enemies bosses levels art art-extra game main; do
    echo "<script src=\"file://$ROOT/js/$f.js\"></script>"
  done
  echo "<script>const g=window.game;const step=n=>{for(let i=0;i<n;i++){g.update();Input.endFrame();}};$SETUP;g.draw();</script>"
  echo '</body></html>'
} > "$TMP/shot.html"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --allow-file-access-from-files --window-size=960,544 --virtual-time-budget=1500 \
  --screenshot="$OUT" "file://$TMP/shot.html" >/dev/null 2>&1
rm -rf "$TMP"
echo "$OUT"
