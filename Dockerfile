# Swiftpass web app: Next.js static export served by nginx, which also proxies /v1 to the API
# and /agent to the voice concierge so the browser stays same-origin.
#   API_UPSTREAM    default http://backend:8000   (e.g. https://swiftpass-api.onrender.com)
#   AGENT_UPSTREAM  default http://agent:8100
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_DEMO_CARD=1 shows the demo card form (only for a backend running in demo mode).
ARG NEXT_PUBLIC_DEMO_CARD=
ENV NEXT_PUBLIC_DEMO_CARD=$NEXT_PUBLIC_DEMO_CARD
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM nginx:1.27-alpine
ENV API_UPSTREAM=http://backend:8000 AGENT_UPSTREAM=http://agent:8100 PORT=80
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 80
