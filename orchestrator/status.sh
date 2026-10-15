#!/usr/bin/env bash
# Tüm pencerelerin son satırlarını gösterir (hızlı durum özeti).
# Kullanım: status.sh [oturum] [satır_sayısı]
SESSION="${1:-dunno}"
LINES="${2:-15}"

tmux list-windows -t "$SESSION" -F '#{window_index} #{window_name}' | while read -r idx name; do
    echo "================ $SESSION:$idx  $name ================"
    tmux capture-pane -t "$SESSION:$idx" -p | grep -v '^\s*$' | tail -n "$LINES"
    echo
done
