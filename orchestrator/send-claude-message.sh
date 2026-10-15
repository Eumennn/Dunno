#!/usr/bin/env bash
# Bir tmux penceresindeki Claude ajanına mesaj gönderir.
# Kullanım: send-claude-message.sh <session:window[.pane]> <mesaj>
# Çok satırlı mesajlar tek satıra indirilir (satır sonları boşluk olur).
set -euo pipefail
# Git Bash "/komut" ile başlayan mesajları Windows yoluna çevirmesin (ör. /exit, /loop)
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"

if [ $# -lt 2 ]; then
    echo "Kullanım: $0 <session:window> <mesaj>"
    echo "Örnek:    $0 dunno:1 'STATUS UPDATE lütfen'"
    exit 1
fi

TARGET="$1"
shift
MESSAGE="$*"

if ! tmux has-session -t "${TARGET%%:*}" 2>/dev/null; then
    echo "HATA: oturum bulunamadı: ${TARGET%%:*}" >&2
    exit 1
fi
if ! tmux display-message -t "$TARGET" -p '#{pane_id}' >/dev/null 2>&1; then
    echo "HATA: hedef bulunamadı: $TARGET" >&2
    exit 1
fi

# psmux'ta paste-buffer -t hedefi yok sayıp aktif pencereye yapıştırıyor; bu yüzden send-keys -l.
# Satır sonları erken "gönder" yapmasın diye boşluğa çevrilir.
MESSAGE="$(printf '%s' "$MESSAGE" | tr '\r\n' '  ')"
tmux send-keys -t "$TARGET" -l "$MESSAGE"

# Claude Code arayüzünün yapıştırmayı işlemesi için bekle, sonra gönder
sleep 1
tmux send-keys -t "$TARGET" Enter

echo "Gönderildi -> $TARGET: ${MESSAGE:0:120}"
