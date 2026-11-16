FROM node:22-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential python3 pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY scripts/serve-farm.mjs ./scripts/serve-farm.mjs
COPY src ./src
COPY assets/runtime ./assets/runtime
ENV STAR_FARM_HOST=0.0.0.0 PORT=8787
USER node
EXPOSE 8787
CMD ["node", "scripts/serve-farm.mjs"]
