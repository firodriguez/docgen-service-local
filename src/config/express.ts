import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import logger from '../services/logger';
import pdfRoutes from '../routes/pdfRoutes';
import healthRoutes from '../routes/healthRoutes';
import templateSessionRoutes from '../routes/templateSessionRoutes';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import rateLimit from 'express-rate-limit';

const app = express();

// ================================
// CORS
// ================================
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === 'development' && (origin.includes('localhost') || origin.includes('127.0.0.1')))
      return callback(null, true);
    logger.info(`CORS: Petición desde origen: ${origin}`);
    return callback(null, true);
  },
  credentials: false,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST'],
  allowedHeaders: [
    'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization',
    'ngrok-skip-browser-warning', 'X-Service', 'X-Client'
  ]
};
app.use(cors(corsOptions));

// ================================
// Rate limiting para /api/
// ================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    error: true,
    message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.'
  }
});
app.use('/api/', limiter);

// ================================
// Servidor estático para assets
// ================================
app.use('/assets', express.static(path.join(__dirname, '../../assets')));

// ================================
// Middlewares globales
// ================================
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestId = uuidv4();
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).requestId;
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const ip = req.ip || req.connection.remoteAddress || '-';
    logger.info(`[Request ID: ${requestId}] ${req.method} ${req.originalUrl} | IP: ${ip}`);
  }
  next();
});

app.use(express.json());

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

// ================================
// Rutas principales
// ================================
app.use('/api', healthRoutes);
app.use('/api', pdfRoutes);
app.use('/api', templateSessionRoutes);

// ================================
// 404 y manejo de errores global
// ================================
app.use((req: Request, res: Response) => {
  const requestId = (req as any).requestId || 'no-id';
  const referer = req.get('referer') || '-';
  const ip = req.ip || req.connection.remoteAddress || '-';
  logger.warn(`[Request ID: ${requestId}] Ruta no encontrada: ${req.method} ${req.originalUrl} | Referer: ${referer} | IP: ${ip}`);
  res.status(404).json({
    error: true,
    message: `Ruta no encontrada. Método: ${req.method}, URL: ${req.originalUrl}`,
    requestId: requestId
  });
});

app.use((err: any, req: Request, res: Response) => {
  const requestId = (req as any).requestId || uuidv4();
  const referer = req.get('referer') || '-';
  const ip = req.ip || req.connection.remoteAddress || '-';
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