// src/services/pdfGenerator.ts - VERSIÓN FINAL
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import path from 'path';
import fs from 'fs';
import logger from './logger';
import QRCode from 'qrcode';
import crypto from 'crypto';

// Función auxiliar para generar código QR
const generateQRCode = async (verificationUrl: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 100,
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

// Función para generar un ID único para el documento
const generateDocumentId = (data: any): string => {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex').substring(0, 12);
};

// Función para guardar el PDF
const savePDF = async (pdfBuffer: Buffer, documentId: string): Promise<string> => {
  const documentsDir = path.join(__dirname, '../../templates/documents');
  
  // Crear directorio si no existe
  if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
  }

  const filePath = path.join(documentsDir, `${documentId}.pdf`);
  await fs.promises.writeFile(filePath, pdfBuffer);
  
  return documentId;
};

const generatePDF = async (templateName: string, data: any, requestInfo?: { ip?: string, referer?: string, requestId?: string }, isPreview: boolean = false) => {
  const startTime = Date.now();

  let qrCodeDataUrl = '';
  let documentId = '';

  if (!isPreview) {
    documentId = generateDocumentId(data);
    // Generar solo la URL de verificación
    const baseUrl = process.env.API_URL || 'http://localhost:3331';
    const verificationUrl = `${baseUrl}/api/verify/${documentId}`;
    qrCodeDataUrl = await generateQRCode(verificationUrl);
  }

  // Agregar el código QR solo si no es preview
  const templateData = {
    ...data,
    ...(qrCodeDataUrl && { qrCode: qrCodeDataUrl }),
    ...(documentId && { documentId: documentId })
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
  const puppeteerBaseUrl = `http://localhost:${port}`;

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
    await page.goto(`${puppeteerBaseUrl}/api/health`, {
      waitUntil: 'domcontentloaded',
      timeout: 5000
    });
    logger.debug(`✅ Base URL establecida: ${puppeteerBaseUrl}`);
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

  // Guardar PDF solo si no es preview
  if (!isPreview && pdfBuffer) {
    await savePDF(pdfBuffer, documentId);
  }

  const duration = Date.now() - startTime;
  
  // ✅ Log siempre en producción con origen del llamado
  const origin = requestInfo?.ip || 'unknown';
  const referer = requestInfo?.referer || '-';
  const requestIdLog = requestInfo?.requestId || '-';
  
  logger.info(`⚡ PDF generado en ${duration}ms | Template: ${templateName} | DocumentID: ${documentId} | IP: ${origin} | Referer: ${referer} | RequestID: ${requestIdLog} | Preview: ${isPreview}`);

  return {
    pdfBuffer,
    documentId
  };
};

export default generatePDF;