FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_URL=/api
ARG VITE_VK_CLIENT_ID=
ARG VITE_VK_REDIRECT_URI=https://buryat-game.ru/auth/vk/callback
ENV VITE_API_URL=$VITE_API_URL VITE_VK_CLIENT_ID=$VITE_VK_CLIENT_ID VITE_VK_REDIRECT_URI=$VITE_VK_REDIRECT_URI
RUN npm run build:web
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/web
EXPOSE 4173
