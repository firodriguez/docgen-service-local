import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors'; // ✅ IMPORTAR CORS
import logger from '../services/logger';
import pdfRoutes from '../routes/pdfRoutes';
import healthRoutes from '../routes/healthRoutes';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const app = express();

// ================================
// CONFIGURACIÓN CORS - SERVICIO PÚBLICO
// ================================
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    // ✅ Permitir peticiones sin origin (Postman, curl, apps móviles, scripts)
    if (!origin) {
      return callback(null, true);
    }

    // ✅ En desarrollo: permitir localhost para testing
    if (process.env.NODE_ENV === 'development' &&
      (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }

    // ✅ SERVICIO PÚBLICO: Permitir cualquier origen
    // La seguridad real está en el token, no en CORS
    logger.info(`CORS: Petición desde origen: ${origin}`);
    return callback(null, true);

    // 💡 Futuro: Si quieres bloquear sitios específicos problemáticos:
    // const blockedDomains = ['sitio-spam.com', 'abuso.com'];
    // if (blockedDomains.some(blocked => origin.includes(blocked))) {
    //   logger.warn(`CORS: Origen bloqueado: ${origin}`);
    //   return callback(new Error('Origen no permitido'));
    // }
  },
  credentials: false, // No necesario para servicio público con token
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'ngrok-skip-browser-warning'
  ]
};

// ✅ APLICAR CORS
app.use(cors(corsOptions));

// ✅ Servidor estático para assets
app.use('/assets', express.static(path.join(__dirname, '../../assets')));

// Middleware para generar requestId y agregarlo al objeto request
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestId = uuidv4();
  next();
});

// Middleware para logging de requests importantes
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;

  // Solo logear ciertos endpoints o métodos importantes
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    const ip = req.ip || req.connection.remoteAddress || '-';
    logger.info(`[Request ID: ${requestId}] ${req.method} ${req.originalUrl} | IP: ${ip}`);
  }

  next();
});

// Middleware para parsear JSON
app.use(express.json());

// Middleware para manejar errores de JSON inválido
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    const requestId = (req as any).requestId;
    const ip = req.ip || req.connection.remoteAddress || '-';

    logger.error(`[Request ID: ${requestId}] JSON inválido | IP: ${ip} | Error: ${err.message}`);

    return res.status(400).json({
      error: true,
      message: err.message,
      requestId: requestId
    });
  } else {
    next(err);
  }
});

// Rutas
app.use('/api', healthRoutes);
app.use('/api', pdfRoutes);

// Middleware para manejar rutas no encontradas (404) - ANTES del error handler
app.use((req: Request, res: Response) => {
  const requestId = (req as any).requestId || 'no-id';
  const referer = req.get('referer') || '-';
  const ip = req.ip || req.connection.remoteAddress || '-';

  // Log del 404 como warning (no es un error del servidor)
  logger.warn(`[Request ID: ${requestId}] Ruta no encontrada: ${req.method} ${req.originalUrl} | Referer: ${referer} | IP: ${ip}`);

  res.status(404).json({
    error: true,
    message: `Ruta no encontrada. Método: ${req.method}, URL: ${req.originalUrl}`,
    requestId: requestId
  });
});

// Manejo de errores global - SIEMPRE AL FINAL
app.use((err: any, req: Request, res: Response) => {
  const requestId = (req as any).requestId || uuidv4();
  const referer = req.get('referer') || '-';
  const ip = req.ip || req.connection.remoteAddress || '-';

  // Solo logear si no se han enviado headers (evitar logs duplicados)
  if (!res.headersSent) {
    logger.error(`[Request ID: ${requestId}] Error: ${err.message || 'Error desconocido'} | Referer: ${referer} | IP: ${ip} | Stack: ${err.stack}`);

    res.status(err.statusCode || 500).json({
      error: true,
      message: err.message || 'Ocurrió un error interno en el servidor.',
      requestId: requestId
    });
  }
});

export default app;