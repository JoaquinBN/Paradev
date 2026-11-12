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

# The repo needs the bun it pins and Node 24; use those even when the global ones are older.
tools() {
	local bin="$RUN_DIR/bin" bun_version
	bun_version=$(grep -o '"packageManager": "bun@[^"]*' package.json | cut -d@ -f2)
	mkdir -p "$bin"
	[ -x "$bin/bun" ] || ln -sf "$(npx -y "bun@$bun_version" -e 'console.log(process.execPath)')" "$bin/bun"
	[ -x "$bin/node" ] || ln -sf "$(npx -y node@24 -e 'console.log(process.execPath)')" "$bin/node"
	export PATH="$bin:$PATH"
}

start() {
	mkdir -p "$RUN_DIR"
	tools
	open -ga Docker
	until docker info >/dev/null 2>&1; do sleep 2; done
	docker compose up -d --wait
	if [ ! -f apps/api/.next/BUILD_ID ]; then
		(cd apps/api && bunx dotenv -e ../../.env -- next build)
	fi
	lsof -ti:"${API_PORT:-3001}" >/dev/null || (cd apps/api && nohup bunx dotenv -e ../../.env -- sh -c "exec next start --port ${API_PORT:-3001}" >"$RUN_DIR/api.log" 2>&1 &)
	lsof -ti:"${RELAY_PORT:-8787}" >/dev/null || (nohup bun run --cwd apps/relay dev >"$RUN_DIR/relay.log" 2>&1 &)
	if [ ! -d "$APP" ]; then
		# A stable signing identity keeps macOS permissions (Accessibility, Screen Recording) across rebuilds.
		IDENTITY=$(security find-identity -v -p codesigning | awk -F'"' '/Apple Development|Developer ID Application/ {print $2; exit}')
		if [ -n "$IDENTITY" ]; then export CSC_NAME="$IDENTITY"; else export CSC_IDENTITY_AUTO_DISCOVERY=false; fi
		(cd apps/desktop && bun run prebuild && bunx electron-builder --config electron-builder.ts --publish never --dir --mac --arm64)
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
