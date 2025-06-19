import { Router } from 'express';
import { createTemplateSession, getTemplateSession } from '../services/templateSessionService';
import { validateToken } from '../middleware/auth';
import logger from '../services/logger';

const router = Router();

// POST /api/template-session
router.post('/template-session', validateToken, async (req, res) => {
  const requestId = (req as any).requestId || 'no-id';
  const ip = req.ip || req.connection.remoteAddress || '-';
  try {
    const { templateName, data } = req.body;
    if (!templateName || !data) {
      logger.warn(`[${requestId}] Faltan datos requeridos | IP: ${ip}`);
      return res.status(400).json({
        error: true,
        message: 'Faltan datos requeridos',
        requestId: requestId
      });
    }
    const result = await createTemplateSession(templateName, data);
    logger.info(`[${requestId}] Sesión guardada correctamente | Template: ${templateName} | ID: ${result.id} | IP: ${ip}`);
    res.status(200).json({
      success: true,
      sessionId: result.id,
      requestId: requestId
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error al guardar la sesión | IP: ${ip} | Error: ${error.message || error}`);
    res.status(500).json({
      error: true,
      message: error.message || 'Error al guardar la sesión',
      requestId: requestId
    });
  }
});

// GET /api/template-session/:id
router.get('/template-session/:id', validateToken, async (req, res) => {
  const requestId = (req as any).requestId || 'no-id';
  const ip = req.ip || req.connection.remoteAddress || '-';
  try {
    const session = await getTemplateSession(req.params.id);
    if (!session) {
      logger.warn(`[${requestId}] Sesión no encontrada | ID: ${req.params.id} | IP: ${ip}`);
      return res.status(404).json({
        error: true,
        message: 'No encontrado',
        requestId: requestId
      });
    }
    logger.info(`[${requestId}] Sesión recuperada correctamente | ID: ${req.params.id} | IP: ${ip}`);
    res.status(200).json({
      success: true,
      session: session,
      requestId: requestId
    });
  } catch (error: any) {
    logger.error(`[${requestId}] Error al recuperar la sesión | ID: ${req.params.id} | IP: ${ip} | Error: ${error.message || error}`);
    res.status(500).json({
      error: true,
      message: error.message || 'Error al recuperar la sesión',
      requestId: requestId
    });
  }
});

export default router; 