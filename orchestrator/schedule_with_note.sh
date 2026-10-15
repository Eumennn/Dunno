#!/usr/bin/env bash
# Bir ajana N dakika sonra not içeren bir hatırlatma gönderir (kendini uyandırma).
# Kullanım: schedule_with_note.sh <dakika> "<not>" [hedef_pencere]
# Hedef verilmezse komutu çalıştıran pencere kullanılır.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MINUTES="${1:-15}"
NOTE="${2:-Standart kontrol}"
TARGET="${3:-$(tmux display-message -p '#{session_name}:#{window_index}' 2>/dev/null || true)}"

if [ -z "$TARGET" ]; then
    echo "HATA: hedef pencere yok ve tmux içinde değilsin. Üçüncü parametreyi ver." >&2
    exit 1
fi
if ! tmux display-message -t "$TARGET" -p '#{pane_id}' >/dev/null 2>&1; then
    echo "HATA: hedef pencere bulunamadı: $TARGET" >&2
    exit 1
fi
if ! [[ "$MINUTES" =~ ^[0-9]+$ ]]; then
    echo "HATA: dakika tam sayı olmalı: $MINUTES" >&2
    exit 1
fi

SAFE_TARGET="${TARGET//[:.]/_}"
NOTE_DIR="$DIR/notes"
NOTE_FILE="$NOTE_DIR/next_check_${SAFE_TARGET}.txt"
mkdir -p "$NOTE_DIR"
{
    echo "=== Sonraki kontrol notu ($(date '+%Y-%m-%d %H:%M:%S')) ==="
    echo "Hedef: $TARGET  |  Süre: $MINUTES dk"
    echo
    echo "$NOTE"
} > "$NOTE_FILE"

RUN_TIME="$(date -d "+${MINUTES} minutes" '+%H:%M:%S')"
SECONDS_TO_WAIT=$((MINUTES * 60))

nohup bash -c "sleep $SECONDS_TO_WAIT && '$DIR/send-claude-message.sh' '$TARGET' \"CHECK-IN zamanı. Notun: \$(tail -n +4 '$NOTE_FILE' | tr '\n' ' ') -- Durumu kontrol et ve işe devam et.\"" \
    > /dev/null 2>&1 &

echo "Planlandı: $TARGET -> $RUN_TIME ($MINUTES dk sonra), PID $!"
echo "Not: $NOTE"
