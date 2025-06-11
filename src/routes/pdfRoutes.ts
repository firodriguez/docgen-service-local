import { Router } from 'express';
import generatePDF from '../services/pdfGenerator';
import logger from '../services/logger';
import { validateToken } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
<<<<<<< HEAD
import handlebars from 'handlebars';
=======
>>>>>>> origin/main

const router = Router();

// Función para validar si un template existe físicamente
const templateExists = (templateName: string): boolean => {
  const templatePath = path.join(__dirname, '../../templates', `${templateName}.hbs`);
  return fs.existsSync(templatePath);
};

<<<<<<< HEAD
// 🔒 POST: Obtener lista de templates disponibles (CON autenticación)
router.post('/templates', validateToken, async (req, res) => {
  const requestId = (req as any).requestId || 'no-id';
  const ip = req.ip || req.connection.remoteAddress || '-';

  try {
    logger.info(`[Request ID: ${requestId}] Solicitando lista de templates (autenticado) | IP: ${ip}`);

    const templatesDir = path.join(__dirname, '../../templates');

    if (!fs.existsSync(templatesDir)) {
      throw new Error('Directorio de templates no encontrado');
    }

    const files = fs.readdirSync(templatesDir);

    const templates = files
      .filter(file => file.endsWith('.hbs'))
      .map(file => {
        const name = file.replace('.hbs', '');
        const filePath = path.join(templatesDir, file);
        const stats = fs.statSync(filePath);

        // Verificar si existe archivo JSON de ejemplo
        const jsonPath = path.join(templatesDir, `${name}.json`);
        const hasExample = fs.existsSync(jsonPath);

        return {
          name: name,
          file: file,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          hasExample: hasExample
        };
      });

    res.status(200).json({
      success: true,
      templates: templates,
      count: templates.length,
      requestId: requestId
    });

    logger.info(`[Request ID: ${requestId}] Lista de templates enviada: ${templates.length} templates (autenticado) | IP: ${ip}`);

  } catch (error: any) {
    logger.error(`[Request ID: ${requestId}] Error obteniendo templates: ${error.message} | IP: ${ip}`);

    res.status(500).json({
      error: true,
      message: 'Error obteniendo lista de templates: ' + error.message,
      requestId: requestId
    });
  }
});

// 🔒 POST: Obtener template específico (HTML crudo) (CON autenticación)
router.post('/templates/:templateName', validateToken, async (req, res) => {
  const templateName = req.params.templateName;
  const requestId = (req as any).requestId || 'no-id';
  const ip = req.ip || req.connection.remoteAddress || '-';

  try {
    logger.info(`[Request ID: ${requestId}] Solicitando template: ${templateName} (autenticado) | IP: ${ip}`);

    if (!templateExists(templateName)) {
      logger.warn(`[Request ID: ${requestId}] Template no encontrado: ${templateName} | IP: ${ip}`);
      return res.status(404).json({
        error: true,
        message: `Template '${templateName}' no encontrado`,
        requestId: requestId
      });
    }

    const templatePath = path.join(__dirname, '../../templates', `${templateName}.hbs`);
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const stats = fs.statSync(templatePath);

    // Extraer variables del template (buscar {{variable}} y {{#loops}})
    const variableMatches = templateContent.match(/\{\{([^}]+)\}\}/g) || [];
    const allVariables = variableMatches.map(match => match.replace(/[{}]/g, '').trim());

    // Filtrar variables (eliminar helpers de Handlebars y duplicados)
    const variables = [...new Set(allVariables.filter(variable => {
      // Excluir helpers de Handlebars como #each, #if, /each, etc.
      return !variable.startsWith('#') &&
        !variable.startsWith('/') &&
        !variable.includes('this') &&
        variable !== 'else';
    }))];

    // Detectar loops especiales (como productos)
    const loopMatches = templateContent.match(/\{\{#([^}]+)\}\}/g) || [];
    const loops = loopMatches.map(match => match.replace(/[{}#]/g, '').trim());

    // Verificar si existe archivo JSON de ejemplo
    const jsonPath = path.join(__dirname, '../../templates', `${templateName}.json`);
    const hasExample = fs.existsSync(jsonPath);

    res.status(200).json({
      success: true,
      template: {
        name: templateName,
        content: templateContent,
        variables: variables,
        loops: loops, // Agregar info de loops
        size: stats.size,
        modified: stats.mtime.toISOString(),
        hasExample: hasExample
      },
      requestId: requestId
    });

    logger.info(`[Request ID: ${requestId}] Template enviado: ${templateName} (${templateContent.length} chars, ${variables.length} variables) (autenticado) | IP: ${ip}`);

  } catch (error: any) {
    logger.error(`[Request ID: ${requestId}] Error obteniendo template ${templateName}: ${error.message} | IP: ${ip}`);

    res.status(500).json({
      error: true,
      message: 'Error obteniendo template: ' + error.message,
      requestId: requestId
    });
  }
});

// 🔒 POST: Preview HTML del template con datos de ejemplo (CON autenticación)
router.post('/templates/:templateName/preview', validateToken, async (req, res) => {
  const templateName = req.params.templateName;
  const requestId = (req as any).requestId || 'no-id';
  const ip = req.ip || req.connection.remoteAddress || '-';

  try {
    logger.info(`[Request ID: ${requestId}] Preview de ejemplo para template: ${templateName} (autenticado) | IP: ${ip}`);

    if (!templateExists(templateName)) {
      return res.status(404).json({
        error: true,
        message: `Template '${templateName}' no encontrado`,
        requestId: requestId
      });
    }

    const templatePath = path.join(__dirname, '../../templates', `${templateName}.hbs`);
    const templateSrc = fs.readFileSync(templatePath, 'utf-8');

    // Datos de ejemplo desde JSON o fallback
    const sampleData = getSampleData(templateName);

    // Compilar y renderizar
    const template = handlebars.compile(templateSrc);
    const htmlContent = template(sampleData);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(200).send(htmlContent);

    logger.info(`[Request ID: ${requestId}] Preview de ejemplo enviado: ${templateName} (autenticado) | IP: ${ip}`);

  } catch (error: any) {
    logger.error(`[Request ID: ${requestId}] Error en preview de ejemplo: ${error.message} | IP: ${ip}`);

    const errorHtml = `
      <html><body style="font-family: Arial; padding: 20px; color: #e74c3c;">
        <h2>❌ Error en Preview</h2>
        <p><strong>Template:</strong> ${templateName}</p>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Request ID:</strong> ${requestId}</p>
      </body></html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(errorHtml);
  }
});

// Función para generar datos de ejemplo desde archivo JSON
function getSampleData(templateName: string): any {
  try {
    // Buscar archivo JSON con el mismo nombre que el template
    const samplePath = path.join(__dirname, '../../templates', `${templateName}.json`);

    if (fs.existsSync(samplePath)) {
      const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
      logger.debug(`Datos de ejemplo cargados desde: ${templateName}.json`);
      return sampleData;
    } else {
      logger.warn(`No se encontró archivo de ejemplo: ${templateName}.json, usando datos básicos`);

      // Fallback a datos básicos si no existe el JSON
      return {
        fecha: new Date().toISOString().split('T')[0],
        cliente: `CLIENTE EJEMPLO - ${templateName.toUpperCase()}`,
        descripcion: `Datos de ejemplo para template ${templateName}`,
        firma: "Responsable del Área",
        nota: `Crea el archivo templates/${templateName}.json para personalizar estos datos`
      };
    }
  } catch (error: any) {
    logger.error(`Error leyendo datos de ejemplo para ${templateName}: ${error.message}`);

    // Fallback en caso de error
    return {
      fecha: new Date().toISOString().split('T')[0],
      cliente: "CLIENTE DE PRUEBA",
      error: `No se pudieron cargar los datos de ejemplo: ${error.message}`
    };
  }
}

// 🔒 ENDPOINT: Generar PDF (CON autenticación)
=======
// Ruta para generar el PDF (CON autenticación - ÚNICO ENDPOINT)
>>>>>>> origin/main
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
<<<<<<< HEAD
    logger.info(`[Request ID: ${requestId}] Iniciando generación de PDF con template: ${templateName} (autenticado) | Referer: ${referer} | IP: ${ip}`);
=======
    logger.info(`[Request ID: ${requestId}] Iniciando generación de PDF con template: ${templateName} | Referer: ${referer} | IP: ${ip}`);
>>>>>>> origin/main

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