import { Router } from 'express';
import generatePDF from '../services/pdfGenerator';
import logger from '../services/logger';
import { validateToken } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

const router = Router();

// Función para validar si un template existe físicamente
const templateExists = (templateName: string): boolean => {
  const templatePath = path.join(__dirname, '../../templates', `${templateName}.hbs`);
  return fs.existsSync(templatePath);
};

// Ruta para generar el PDF (CON autenticación - ÚNICO ENDPOINT)
router.post('/pdf/view', validateToken, async (req, res) => {
  const templateName = req.query.template as string;
  const data = req.body;
  const requestId = (req as any).requestId || 'no-id';
  const referer = req.get('referer') || '-';
  const ip = req.ip || req.connection.remoteAddress || '-';

  // VALIDACIÓN OBLIGATORIA: Template debe ser proporcionado
  if (!templateName || templateName.trim() === '') {
    logger.warn(`[Request ID: ${requestId}] Template no proporcionado - OBLIGATORIO | Referer: ${referer} | IP: ${ip}`);
    return res.status(400).json({
      error: true,
      message: 'El parámetro template es obligatorio. Debe especificar qué plantilla usar.',
      requestId: requestId
    });
  }

  // Validar que el template existe físicamente antes de procesarlo
  if (!templateExists(templateName)) {
    logger.error(`[Request ID: ${requestId}] Template no encontrado: ${templateName} | Referer: ${referer} | IP: ${ip}`);
    return res.status(404).json({
      error: true,
      message: `La plantilla "${templateName}" no se encuentra disponible.`,
      requestId: requestId
    });
  }

  try {
    // Log del inicio del proceso de generación de PDF
    logger.info(`[Request ID: ${requestId}] Iniciando generación de PDF con template: ${templateName} | Referer: ${referer} | IP: ${ip}`);

    // ✅ MEJORADO: Pasar info del request al generador
    const requestInfo = {
      ip: ip,
      referer: referer,
      requestId: requestId
    };

    const pdfBuffer = await generatePDF(templateName, data, requestInfo);

    res.contentType('application/pdf');
    res.send(pdfBuffer);
  } catch (error: any) {
    // Log del error específico
    logger.error(`[Request ID: ${requestId}] Error generando PDF con template: ${templateName} | Error: ${error.message} | Referer: ${referer} | IP: ${ip} | Stack: ${error.stack}`);

    // Manejo de errores con estructura estándar unificada
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Ha ocurrido un error interno en el servidor.';

    res.status(statusCode).json({
      error: true,
      message: message,
      requestId: requestId
    });
  }
});

export default router;