# Multi-stage build para optimizar tamaño final
FROM node:20-slim AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias primero (mejor cache)
COPY package*.json ./

# Instalar dependencias (incluyendo devDependencies para build)
RUN npm ci --only=production=false

# Copiar código fuente
COPY . .

# Build del proyecto TypeScript
RUN npm run build

# Eliminar devDependencies después del build
RUN npm prune --production

# Stage 2: Runtime image con Puppeteer/Chromium
FROM node:20-slim AS runtime

# Instalar dependencias del sistema para Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  fonts-liberation2 \
  fontconfig \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libxss1 \
  libxtst6 \
  libxfixes3 \
  libgbm1 \
  libgconf-2-4 \
  chromium \
  wget \
  xdg-utils \
  dumb-init \
  --no-install-recommends && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
  CHROME_PATH=/usr/bin/chromium \
  DISPLAY=:99

# Crear usuario no-root para seguridad
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Crear directorios necesarios para Chrome
RUN mkdir -p /tmp/.X11-unix && \
  chmod 1777 /tmp/.X11-unix && \
  mkdir -p /home/nodejs/.config && \
  mkdir -p /home/nodejs/.cache && \
  chown -R nodejs:nodejs /home/nodejs

# Establecer directorio de trabajo
WORKDIR /app

# Copiar solo lo necesario del builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copiar templates si existen
COPY --chown=nodejs:nodejs templates/ ./templates/

# Crear directorio de logs
RUN mkdir -p logs && chown nodejs:nodejs logs

# Cambiar a usuario no-root
USER nodejs

# Crear directorio temporal para Chrome en el home del usuario
RUN mkdir -p /home/nodejs/tmp

# Exponer puerto
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["node", "dist/index.js"]