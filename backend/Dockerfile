FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg ca-certificates \
  && python3 -m pip install --break-system-packages --no-cache-dir yt-dlp \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

COPY . .

RUN chmod +x ./scripts/docker-start.sh

EXPOSE 4000

CMD ["./scripts/docker-start.sh"]
