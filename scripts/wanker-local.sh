#!/bin/bash
# Runs Wanker locally with the least memory: production builds of the API and the desktop
# app instead of their dev servers. Builds on first start; delete apps/api/.next/BUILD_ID or
# apps/desktop/release to rebuild.  usage: scripts/wanker-local.sh start|stop
set -euo pipefail
cd "$(dirname "$0")/.."
RUN_DIR="${TMPDIR:-/tmp}/wanker-local"
APP="apps/desktop/release/mac-arm64/Wanker.app"
port() { grep -E "^$1=" .env | tail -1 | cut -d= -f2 | tr -d '"'; }
API_PORT=$(port API_PORT)
RELAY_PORT=$(port RELAY_PORT)

start() {
	mkdir -p "$RUN_DIR"
	open -ga Docker
	until docker info >/dev/null 2>&1; do sleep 2; done
	docker compose up -d --wait
	if [ ! -f apps/api/.next/BUILD_ID ]; then
		(cd apps/api && bunx dotenv -e ../../.env -- next build)
	fi
	(cd apps/api && nohup bunx dotenv -e ../../.env -- sh -c "exec next start --port ${API_PORT:-3001}" >"$RUN_DIR/api.log" 2>&1 &)
	(nohup bun run --cwd apps/relay dev >"$RUN_DIR/relay.log" 2>&1 &)
	if [ ! -d "$APP" ]; then
		(cd apps/desktop && bun run prebuild && CSC_IDENTITY_AUTO_DISCOVERY=false bunx electron-builder --config electron-builder.ts --publish never --dir --mac --arm64)
	fi
	open "$APP"
	echo "Wanker is running. Logs: $RUN_DIR"
}

stop() {
	osascript -e 'tell application id "com.wanker.desktop" to quit' 2>/dev/null || true
	for p in "${API_PORT:-3001}" "${RELAY_PORT:-8787}"; do
		lsof -ti "tcp:$p" -sTCP:LISTEN | xargs kill 2>/dev/null || true
	done
	pkill -f "$PWD/(apps/api|apps/relay|node_modules)" 2>/dev/null || true
	docker compose stop
	# Docker's VM holds memory of its own; quit it unless something else still uses it.
	if [ -z "$(docker ps -q)" ]; then osascript -e 'quit app "Docker"'; fi
}

case "${1:-}" in
start) start ;;
stop) stop ;;
*) echo "usage: $0 start|stop" >&2; exit 64 ;;
esac
