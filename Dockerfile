# Swiftpass web app: Vite build served by nginx, which also proxies /v1 to the API
# and /agent to the voice concierge so the browser stays same-origin.
#   API_UPSTREAM    default http://backend:8000   (e.g. https://swiftpass-api.onrender.com)
#   AGENT_UPSTREAM  default http://agent:8100
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
ENV API_UPSTREAM=http://backend:8000 AGENT_UPSTREAM=http://agent:8100 PORT=80
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
