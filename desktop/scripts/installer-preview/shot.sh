#!/bin/bash
# FB6 kurulum önizlemesi: kurulumu Wine + Xvfb (:99) içinde açar, her tuştan sonra ekran görüntüsü alır.
# Sadece sanal ekran; gerçek masaüstüne dokunmaz.
# kullanım: shot.sh <setup.exe> <çıktı-öneki> [ileri tıklama sayısı...]
export WINEPREFIX=/tmp/wpfx WINEDEBUG=-all DISPLAY=:99 LANG=${LANG_OVR:-tr_TR.UTF-8}
wineserver -k 2>/dev/null; sleep 1
wine "$1" > /dev/null 2>&1 &
sleep 6
W=$(xdotool search --onlyvisible --name "unno" | head -1)
xdotool windowmove "$W" 20 20 2>/dev/null; sleep 1
import -window root "$2-0.png"
i=1
for k in "${@:3}"; do
  xdotool key --window "$W" "$k"; sleep 3
  import -window root "$2-$i.png"; i=$((i+1))
done
