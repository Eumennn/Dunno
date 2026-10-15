#!/usr/bin/env bash
# Dunno ajan ekibini tmux'ta başlatır.
#   0 PM  |  1 Desktop  |  2 Backend  |  3 App-Run  |  4 Shell
# Kullanım: ./orchestrator/start-team.sh [spec dosyası]
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"
WROOT="$(cygpath -m "$ROOT" 2>/dev/null || echo "$ROOT")"   # psmux Windows yolu ister
SESSION="dunno"
SPEC="${1:-specs/02-backend-desktop.md}"
CLAUDE_CMD="${CLAUDE_CMD:-claude --permission-mode auto}"
FE="$ROOT/.worktrees/desktop"
BE="$ROOT/.worktrees/backend"

cd "$ROOT"

# Bir Claude oturumunun içinden çalıştırılırsa onun değişkenleri (CHILD_SESSION, ANTHROPIC_BASE_URL...) psmux sunucusuna
# ve tüm ajanlara geçer: sohbet kaydı kapanır, --continue çalışmaz. Temizle.
for v in $(env | grep -E "^(CLAUDE_CODE_[A-Z_]*|CLAUDECODE|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AGENT_SDK_VERSION|CLAUDE_PREVIEW_[A-Z_]*|ANTHROPIC_[A-Z_]*)=" | grep -v "^CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=" | cut -d= -f1); do unset "$v"; done

if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "'$SESSION' oturumu zaten var. Bağlanmak için: tmux attach -t $SESSION"
    echo "Sıfırdan başlatmak için önce: tmux kill-session -t $SESSION"
    exit 1
fi

[ -f "$SPEC" ] || { echo "Spec bulunamadı: $SPEC" >&2; exit 1; }
git rev-parse --verify HEAD >/dev/null 2>&1 || { echo "Repo'da commit yok. Önce ilk commit'i at." >&2; exit 1; }

# Worktree'ler (her mühendis kendi branch'inde)
make_wt() {
    local path="$1" branch="$2"
    if [ ! -d "$path" ]; then
        if git show-ref --verify --quiet "refs/heads/$branch"; then
            git worktree add "$path" "$branch"
        else
            git worktree add -b "$branch" "$path" main
        fi
    fi
}
make_wt "$FE" feature/desktop
make_wt "$BE" feature/worker

# Claude'un hazır olmasını bekler; klasör güven sorusu çıkarsa onaylar.
wait_for_claude() {
    local target="$1" i out
    for i in $(seq 1 60); do
        out="$(tmux capture-pane -t "$target" -p)"
        if grep -qi "trust" <<<"$out" && grep -qi "proceed" <<<"$out"; then
            tmux send-keys -t "$target" Enter
            sleep 2
            continue
        fi
        if grep -qiE "accept edits|for shortcuts|bypass permissions" <<<"$out"; then
            return 0
        fi
        sleep 1
    done
    echo "UYARI: $target içinde Claude 60 sn'de hazır görünmedi, yine de devam ediliyor." >&2
}

start_agent() {
    local target="$1" briefing="$2"
    tmux send-keys -t "$target" "$CLAUDE_CMD" Enter
    wait_for_claude "$target"
    sleep 2
    "$DIR/send-claude-message.sh" "$target" \
        "Sen $target penceresindesin. Önce CLAUDE.md dosyasını, sonra orchestrator/briefings/$briefing dosyasını oku ve talimatları uygula. Aktif spec: $SPEC"
}

# psmux: new-window -t oturum:N desteklemiyor; pencereler sırayla 1..4 olur
tmux new-session -d -s "$SESSION" -n "PM" -c "$WROOT"
tmux new-window -t "$SESSION" -n "Desktop" -c "$WROOT/.worktrees/desktop"
tmux new-window -t "$SESSION" -n "Backend" -c "$WROOT/.worktrees/backend"
tmux new-window -t "$SESSION" -n "App-Run" -c "$WROOT/.worktrees/desktop"
tmux new-window -t "$SESSION" -n "Shell" -c "$WROOT"

# Önce mühendisler hazır olsun, en son PM brief edilsin (PM onlara görev dağıtacak)
start_agent "$SESSION:1" desktop.md
start_agent "$SESSION:2" backend.md
start_agent "$SESSION:0" pm.md

tmux select-window -t "$SESSION:0"
echo
echo "Ekip başladı. Bağlan:  tmux attach -t $SESSION"
echo "Pencereler arası: Ctrl+b sonra 0..4   |   Ayrıl: Ctrl+b d"
echo "Hızlı durum:          ./orchestrator/status.sh"
