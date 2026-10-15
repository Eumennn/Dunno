#!/usr/bin/env bash
# Kapanmış ekibi kaldığı yerden açar: mühendisler son sohbetlerine devam eder (--continue),
# PM temiz başlar ve verilen hedef dosyasıyla /loop döngüsüne girer.
# Kullanım: ./orchestrator/resume-team.sh [hedef dosyası]
# Claude oturumundan bağımsız açmak için: orchestrator/ResumeTeam.cmd (explorer üzerinden).
set -euo pipefail
export MSYS_NO_PATHCONV=1

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"
WROOT="$(cygpath -m "$ROOT" 2>/dev/null || echo "$ROOT")"
SESSION="dunno"
GOAL="${1:-$(cat "$DIR/prompts/CURRENT" 2>/dev/null || echo orchestrator/prompts/goal-spec09.md)}"

for v in $(env | grep -E "^(CLAUDE_CODE_[A-Z_]*|CLAUDECODE|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AGENT_SDK_VERSION|CLAUDE_PREVIEW_[A-Z_]*|ANTHROPIC_[A-Z_]*)=" | grep -v "^CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=" | cut -d= -f1); do unset "$v"; done

if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "'$SESSION' zaten açık: tmux attach -t $SESSION"
    exit 0
fi

tmux new-session -d -s "$SESSION" -n "PM" -c "$WROOT"
tmux new-window -t "$SESSION" -n "Desktop" -c "$WROOT/.worktrees/desktop"
tmux new-window -t "$SESSION" -n "Backend" -c "$WROOT/.worktrees/backend"
tmux new-window -t "$SESSION" -n "App-Run" -c "$WROOT/.worktrees/desktop"
tmux new-window -t "$SESSION" -n "Shell" -c "$WROOT"
sleep 2

wait_ready() {
    local t="$1" i out
    for i in $(seq 1 60); do
        out="$(tmux capture-pane -t "$t" -p)"
        # LSP / eklenti önerisi çıkarsa "şimdi değil"
        if grep -q "Would you like to install" <<<"$out"; then tmux send-keys -t "$t" 2; sleep 2; continue; fi
        grep -qiE "auto mode on|for shortcuts" <<<"$out" && return 0
        sleep 2
    done
}

for w in 1 2; do tmux send-keys -t "$SESSION:$w" -l 'claude --continue --permission-mode auto'; tmux send-keys -t "$SESSION:$w" Enter; done
tmux send-keys -t "$SESSION:0" -l 'claude --permission-mode auto'; tmux send-keys -t "$SESSION:0" Enter
for w in 1 2 0; do wait_ready "$SESSION:$w"; done
sleep 3

MSG="Oturum yeniden açıldı. Yarım işini commit et (bitmediyse WIP), git merge main yap, PM'e (dunno:0) STATUS gönder: son yaptığın, yarım kalan, commit hash. Sonra PM'den görev bekle."
"$DIR/send-claude-message.sh" "$SESSION:1" "$MSG"
"$DIR/send-claude-message.sh" "$SESSION:2" "$MSG"
sleep 2
"$DIR/send-claude-message.sh" "$SESSION:0" "/loop Sen dunno:0 penceresindeki PM'sin. Oturum yeniden açıldı; mühendisler sana STATUS gönderecek. İlk turda CLAUDE.md, orchestrator/briefings/pm.md ve orchestrator/notes/plan.md oku. Her turda $GOAL dosyasını oku ve uygula. Bitince son raporu kullanıcıya ver ve döngüyü durdur."

echo "Ekip açıldı. İzlemek için: tmux attach -t $SESSION"
