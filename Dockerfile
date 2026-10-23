# KITARecycle scale web app (dashboard + device API). Built by Coolify with base directory /web.
# Node 24 LTS: node:sqlite works without flags, so there are no native modules to compile.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 DATA_DIR=/data
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# The SQLite database lives here; mount a persistent volume on /data or every redeploy wipes it.
RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 3000
CMD ["node", "server.js"]
