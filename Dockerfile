FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vacío = misma URL que el dashboard: nginx hace de proxy hacia la API.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# API de semanticClassification vista desde el contenedor.
ENV API_UPSTREAM=http://host.docker.internal:8000
EXPOSE 80
