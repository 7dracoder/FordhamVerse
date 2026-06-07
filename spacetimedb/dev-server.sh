#!/usr/bin/env bash
# Dev-only SpacetimeDB launcher for FordhamVerse.
#
# Starts a local standalone SpacetimeDB server and (re)publishes the module.
# The data directory is wiped on every start: each `--anonymous` publish mints a
# fresh throwaway identity, so persisting old data would leave the `fordhamverse`
# database owned by a previous identity and block republishing. A clean slate
# keeps local dev reliable across restarts (player presence is ephemeral anyway).
set -uo pipefail

export PATH="$HOME/.local/bin:$PATH"
# NOTE: the spacetime CLI resolves its data dir to the workspace-rooted path
# below regardless of the workflow's $HOME, so we wipe that explicit location
# (just the `data` subdir — keep the downloaded standalone binary).
DATA_DIR="/home/runner/workspace/.local/share/spacetime/data"
MODULE_DIR="$(cd "$(dirname "$0")" && pwd)"
LISTEN_ADDR="0.0.0.0:3000"
HEALTH_URL="http://127.0.0.1:3000/v1/ping"

echo "[dev-server] wiping data dir: $DATA_DIR"
rm -rf "$DATA_DIR"

echo "[dev-server] starting spacetime on $LISTEN_ADDR"
spacetime start --listen-addr "$LISTEN_ADDR" &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "[dev-server] waiting for server to become ready..."
for _ in $(seq 1 120); do
  if curl -sf -o /dev/null "$HEALTH_URL" 2>/dev/null; then
    echo "[dev-server] server is ready"
    break
  fi
  sleep 0.5
done

echo "[dev-server] publishing module 'fordhamverse'..."
if (cd "$MODULE_DIR" && spacetime publish --anonymous --yes -s "http://127.0.0.1:3000" fordhamverse); then
  echo "[dev-server] module published"
else
  echo "[dev-server] WARNING: publish failed; server still running (clients will fall back to single-player)"
fi

wait "$SERVER_PID"
