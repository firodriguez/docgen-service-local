// src/index.ts - CONFIGURACIÓN SIMPLE
import app from './config/express';
import dotenv from 'dotenv';
import logger from './services/logger';

dotenv.config();

const port = process.env.PORT;
const environment = process.env.NODE_ENV;

// SOLO 2 ENTORNOS: development y production
if (environment === 'production') {
  logger.info('🚀 Servidor iniciado en PRODUCCIÓN');
} else {
  logger.info('🛠️ Servidor iniciado en DESARROLLO');
}

app.listen(port, () => {
  logger.info(`🌐 Servidor corriendo en: http://localhost:${port}`);
  logger.info(`📊 Entorno: ${environment || 'development'}`);
});