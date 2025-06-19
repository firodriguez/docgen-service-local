// src/index.ts - CONFIGURACIÓN SIMPLE
import dotenv from 'dotenv';
import logger from './services/logger';
import db from './services/db';
import app from './config/express'; // Usar el app avanzado con middlewares y rutas

dotenv.config();

const port = process.env.PORT || 3000;
const environment = process.env.NODE_ENV;

// SOLO 2 ENTORNOS: development y production
if (environment === 'production') {
  logger.info('🚀 Servidor iniciado en PRODUCCIÓN');
} else {
  logger.info('🛠️ Servidor iniciado en DESARROLLO');
}

// Probar conexión a PostgreSQL al iniciar
// Esto ayuda a saber si la conexión está bien desde el arranque
// y muestra un mensaje claro en consola

db.connect()
  .then(obj => {
    logger.info('✅ Conexión a PostgreSQL exitosa');
    obj.done(); // cerrar la conexión de prueba
  })
  .catch(error => {
    logger.error('❌ Error al conectar a PostgreSQL:', error);
  });

app.listen(port, () => {
  logger.info(`🌐 Servidor corriendo en: http://localhost:${port}`);
  logger.info(`📊 Entorno: ${environment || 'development'}`);
});