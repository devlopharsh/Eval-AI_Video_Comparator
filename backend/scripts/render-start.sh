#!/bin/sh
set -eu

if [ -n "${YTDLP_COOKIES_B64:-}" ]; then
  COOKIE_PATH="/tmp/yt-dlp-cookies.txt"
  printf '%s' "$YTDLP_COOKIES_B64" | base64 -d > "$COOKIE_PATH"
  export YTDLP_COOKIES_FILE="$COOKIE_PATH"
fi

npx prisma migrate deploy
node dist/main.js
