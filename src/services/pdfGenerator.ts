// src/services/pdfGenerator.ts - VERSIÓN FINAL
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import logger from './logger';
import QRCode from 'qrcode';

// Función auxiliar para generar código QR
const generateQRCode = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (error) {
    logger.error('Error generando código QR:', error);
    throw error;
  }
};

const generatePDF = async (templateName: string, data: any, requestInfo?: { ip?: string, referer?: string, requestId?: string }) => {
  const startTime = Date.now();

  // Generar código QR con información de verificación
  const verificationData = {
    timestamp: new Date().toISOString(),
    requestId: requestInfo?.requestId || 'unknown',
    template: templateName
  };
  
  const qrCodeDataUrl = await generateQRCode(JSON.stringify(verificationData));
  
  // Agregar el código QR a los datos del template
  const templateData = {
    ...data,
    qrCode: qrCodeDataUrl
  };

  // 1. Cargar y compilar template SIEMPRE (sin cache)
  const templatePath = path.join(__dirname, '../../templates', `${templateName}.hbs`);

  if (!fs.existsSync(templatePath)) {
    const error = new Error(`La plantilla "${templateName}" no se encuentra disponible.`);
    (error as any).statusCode = 404;
    throw error;
  }

  // Siempre leer desde disco para hot-reload
  const templateSrc = fs.readFileSync(templatePath, 'utf-8');
  const template = handlebars.compile(templateSrc);
  logger.debug(`🔄 Template ${templateName} (hot-reload enabled)`);

  const html = template(templateData);

  // 2. ✅ BASE_URL SIMPLE: localhost siempre en contenedor
  const port = process.env.PORT || '3000';
  const baseUrl = `http://localhost:${port}`;

  // 3. Configuración inteligente de Puppeteer
  let browser;

  try {
    // Intentar usar Chromium del sistema (Docker/Producción)
    if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security'
        ]
      });
    } else {
      // Fallback: usar Chrome bundled (desarrollo local)
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security'
        ]
      });
    }
  } catch (error: any) {
    // Error más descriptivo para debugging
    const errorMessage = `Error al inicializar Puppeteer: ${error.message}. ` +
      `En desarrollo local, asegúrate de tener Chrome instalado. ` +
      `En Docker, verifica que Chromium esté disponible en ${process.env.PUPPETEER_EXECUTABLE_PATH}.`;

    const enhancedError = new Error(errorMessage);
    (enhancedError as any).statusCode = 500;
    throw enhancedError;
  }

  const page = await browser.newPage();

  // 4. Mejor resolución
  await page.setViewport({
    width: 1200,
    height: 1600,
    deviceScaleFactor: 1.5
  });

  // 5. Interceptación RÁPIDA
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();

    if (resourceType === 'document' ||
      resourceType === 'stylesheet' ||
      resourceType === 'image' ||
      resourceType === 'font') {
      req.continue();
    } else {
      req.abort();
    }
  });

  // 6. Timeouts
  await page.setDefaultNavigationTimeout(8000);
  await page.setDefaultTimeout(8000);

  // 7. ✅ Establecer base URL para rutas relativas
  try {
    // Intentar navegar a health check para establecer base URL
    await page.goto(`${baseUrl}/api/health`, {
      waitUntil: 'domcontentloaded',
      timeout: 5000
    });
    logger.debug(`✅ Base URL establecida: ${baseUrl}`);
  } catch (error) {
    logger.warn(`⚠️ No se pudo establecer base URL, usando setContent directo`);
  }

  // 8. Cargar contenido HTML
  const hasImages = html.includes('<img') || html.includes('background-image');

  if (hasImages) {
    await page.setContent(html, { waitUntil: 'networkidle2' });
  } else {
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
  }

  // 9. Generar PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    scale: 1
  });

  await browser.close();

  const duration = Date.now() - startTime;
  
  // ✅ Log siempre en producción con origen del llamado
  const origin = requestInfo?.ip || 'unknown';
  const referer = requestInfo?.referer || '-';
  const requestId = requestInfo?.requestId || '-';
  
  logger.info(`⚡ PDF generado en ${duration}ms | Template: ${templateName} | IP: ${origin} | Referer: ${referer} | RequestID: ${requestId}`);

  return pdfBuffer;
};

export default generatePDF;