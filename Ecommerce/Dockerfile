FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app


# Dependencias primero para aprovechar la caché de capas
# (requiere package-lock.json actualizado: ejecuta `npm install` localmente tras agregar dependencias)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Carpeta de PDFs (en compose es un volumen compartido entre api y worker)
RUN mkdir -p /app/storage && chown -R node:node /app
USER node


EXPOSE 3000
CMD ["npm", "src/app.js"]
