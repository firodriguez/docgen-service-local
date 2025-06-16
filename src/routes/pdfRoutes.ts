import { Router } from 'express';
import generatePDF from '../services/pdfGenerator';
import logger from '../services/logger';
import { validateToken } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import handlebars from 'handlebars';

const router = Router();

// Función para validar si un template existe físicamente
const templateExists = (templateName: string): boolean => {
  const templatePath = path.join(__dirname, '../../templates', `${templateName}.hbs`);
  return fs.existsSync(templatePath);
};

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

// 🔒 POST: Obtener template específico CON ANÁLISIS DE JSON
router.post('/templates/:templateName', validateToken, async (req, res) => {
  const templateName = req.params.templateName;
  const requestId = (req as any).requestId || 'no-id';
  const ip = req.ip || req.connection.remoteAddress || '-';

  try {
    logger.info(
      `[Request ID: ${requestId}] Solicitando template: ${templateName} (autenticado) | IP: ${ip}`
    );

    if (!templateExists(templateName)) {
      logger.warn(
        `[Request ID: ${requestId}] Template no encontrado: ${templateName} | IP: ${ip}`
      );
      return res.status(404).json({
        error: true,
        message: `Template '${templateName}' no encontrado`,
        requestId: requestId,
      });
    }

    const templatePath = path.join(
      __dirname,
      "../../templates",
      `${templateName}.hbs`
    );
    const templateContent = fs.readFileSync(templatePath, "utf-8");
    const stats = fs.statSync(templatePath);

    // 🚀 CARGAR JSON DE EJEMPLO PARA ANÁLISIS MEJORADO
    const jsonPath = path.join(
      __dirname,
      "../../templates",
      `${templateName}.json`
    );
    const hasExample = fs.existsSync(jsonPath);

    let sampleData = null;
    let analyzedStructure = null;

    if (hasExample) {
      try {
        sampleData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

        // 🎯 ANALIZAR ESTRUCTURA DEL JSON CON FUNCIONES MEJORADAS
        analyzedStructure = analyzeJSONStructure(sampleData);

        logger.info(
          `[Request ID: ${requestId}] JSON de ejemplo analizado completamente para ${templateName}`
        );
      } catch (error: any) {
        logger.warn(
          `[Request ID: ${requestId}] Error leyendo JSON de ejemplo: ${error.message}`
        );
      }
    } else {
      // 🔧 GENERAR DATOS DE EJEMPLO MEJORADOS
      sampleData = getSampleDataEnhanced(templateName);
      analyzedStructure = analyzeJSONStructure(sampleData);
    }

    // 📤 RESPUESTA MEJORADA Y COMPLETA
    res.status(200).json({
      success: true,
      template: {
        name: templateName,
        content: templateContent,

        // 🎯 ESTRUCTURA COMPLETA BASADA EN ANÁLISIS MEJORADO
        ...(analyzedStructure || {
          normalVariables: [],
          conditionalVariables: [],
          arrayInfo: [],
          loops: [],
        }),

        // Metadatos básicos
        size: stats.size,
        modified: stats.mtime.toISOString(),
        hasExample: hasExample,
        sampleData: sampleData,

        // 🔧 NUEVA INFO: Metadatos de análisis
        analysisMetadata: {
          hasNestedObjects: analyzedStructure
            ? analyzedStructure.normalVariables.some((v) => v.includes("."))
            : false,
          hasArraysWithThis: analyzedStructure
            ? analyzedStructure.arrayInfo.some((a) => a.hasThisContext)
            : false,
          complexityLevel: getComplexityLevel(analyzedStructure),
        },
      },
      requestId: requestId,
    });

    logger.info(
      `[Request ID: ${requestId}] Template enviado: ${templateName} (${templateContent.length} chars) | IP: ${ip}`
    );
  } catch (error: any) {
    logger.error(`[Request ID: ${requestId}] Error obteniendo template ${templateName}: ${error.message} | IP: ${ip}`);

    res.status(500).json({
      error: true,
      message: 'Error obteniendo template: ' + error.message,
      requestId: requestId
    });
  }
});

// 🔧 FUNCIÓN HELPER: Calcular nivel de complejidad
function getComplexityLevel(analysis: any): string {
  if (!analysis) return 'unknown';
  
  const totalVariables = analysis.normalVariables.length + analysis.conditionalVariables.length;
  const totalArrays = analysis.arrayInfo.length;
  const hasNestedArrays = analysis.arrayInfo.some((a: any) => a.nestedArrays.length > 0);
  const hasThisContext = analysis.arrayInfo.some((a: any) => a.hasThisContext);

  if (totalVariables > 20 || totalArrays > 5 || hasNestedArrays || hasThisContext) {
    return 'complex';
  } else if (totalVariables > 10 || totalArrays > 2) {
    return 'medium';
  } else {
    return 'simple';
  }
}

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

/// 🎯 FUNCIÓN MEJORADA PARA ANALIZAR JSON - DETECTA TODO
function analyzeJSONStructure(data: any) {
  const result = {
    normalVariables: [] as string[],
    conditionalVariables: [] as string[],
    arrayInfo: [] as any[],
    loops: [] as string[],
    allVariables: [] as string[]
  };

  if (!data || typeof data !== 'object') {
    return result;
  }

  console.log('🔍 Analizando estructura JSON completa...');

  // 🔧 PASO 1: Analizar propiedades del nivel raíz
  Object.keys(data).forEach(key => {
    const value = data[key];

    if (Array.isArray(value)) {
      // 📋 ES UN ARRAY
      analyzeArray(key, value, result);
    } else if (typeof value === 'boolean') {
      // 🔘 ES UN BOOLEAN (probablemente condicional)
      if (key.startsWith('show') || key.startsWith('enable') || key.startsWith('display')) {
        result.conditionalVariables.push(key);
      } else {
        result.normalVariables.push(key);
      }
    } else if (typeof value === 'object' && value !== null) {
      // 🏗️ ES UN OBJETO - ANALIZAR PROPIEDADES ANIDADAS
      analyzeNestedObject(key, value, result);
    } else if (typeof value === 'string' || typeof value === 'number') {
      // 📝 ES UNA VARIABLE SIMPLE
      result.normalVariables.push(key);
    }
  });

  // 🧹 LIMPIAR Y ORGANIZAR
  result.normalVariables = [...new Set(result.normalVariables)].sort();
  result.conditionalVariables = [...new Set(result.conditionalVariables)].sort();
  result.allVariables = [
    ...result.normalVariables,
    ...result.conditionalVariables,
    ...result.arrayInfo.flatMap(arr => arr.variables)
  ];

  console.log(`✅ Estructura analizada completa: ${result.normalVariables.length} variables, ${result.conditionalVariables.length} condicionales, ${result.arrayInfo.length} arrays`);
  console.log('📝 Variables normales:', result.normalVariables);
  console.log('🔘 Variables condicionales:', result.conditionalVariables);
  console.log('📋 Arrays:', result.arrayInfo.map(a => a.name));

  return result;
}

// 🔧 NUEVA FUNCIÓN: Analizar objetos anidados
function analyzeNestedObject(objectName: string, objectData: any, result: any) {
  console.log(`🏗️ Analizando objeto anidado: ${objectName}`, Object.keys(objectData));

  // Agregar cada propiedad del objeto como variable editable
  Object.keys(objectData).forEach(propertyName => {
    const fullVariableName = `${objectName}.${propertyName}`;
    result.normalVariables.push(fullVariableName);
    
    console.log(`  ✅ Variable anidada detectada: ${fullVariableName}`);
  });

  // IMPORTANTE: También agregar el objeto completo para referencia
  result.normalVariables.push(objectName);
}

// 🔍 FUNCIÓN MEJORADA: Analizar arrays y detectar arrays anidados con {{this}}
function analyzeArray(arrayName: string, arrayData: any[], result: any) {
  console.log(`📋 Analizando array: ${arrayName} con ${arrayData.length} elementos`);

  if (arrayData.length === 0) {
    // Array vacío
    result.arrayInfo.push({
      name: arrayName,
      variables: [],
      nestedArrays: [],
      hasThisContext: false
    });
    result.loops.push(`each ${arrayName}`);
    return;
  }

  // 📊 ANALIZAR EL PRIMER ELEMENTO PARA VER LA ESTRUCTURA
  const firstItem = arrayData[0];
  const variables: string[] = [];
  const nestedArrays: any[] = [];
  let hasThisContext = false;

  if (typeof firstItem === 'string' || typeof firstItem === 'number') {
    // 🎯 ARRAY DE STRINGS/NÚMEROS - REQUIERE {{this}}
    hasThisContext = true;
    variables.push('this'); // Agregar {{this}} como variable especial
    console.log(`  🎯 Array de primitivos detectado: ${arrayName} requiere {{this}}`);
  } else if (typeof firstItem === 'object' && firstItem !== null) {
    // 📊 ARRAY DE OBJETOS
    Object.keys(firstItem).forEach(key => {
      const value = firstItem[key];

      if (Array.isArray(value)) {
        // 🔗 ARRAY ANIDADO DETECTADO
        const isStringArray = value.length > 0 && typeof value[0] === 'string';
        
        nestedArrays.push({
          name: key,
          parentArray: arrayName,
          variables: isStringArray ? ['this'] : Object.keys(value[0] || {}),
          hasThisContext: isStringArray
        });

        console.log(`  🔗 Array anidado detectado: ${key} dentro de ${arrayName}, hasThis: ${isStringArray}`);
      } else {
        // 📝 VARIABLE DEL ARRAY
        variables.push(key);
      }
    });
  }

  result.arrayInfo.push({
    name: arrayName,
    variables: variables,
    nestedArrays: nestedArrays,
    hasThisContext: hasThisContext
  });

  result.loops.push(`each ${arrayName}`);

  console.log(`  ✅ Array ${arrayName}: ${variables.length} variables, ${nestedArrays.length} arrays anidados, hasThis: ${hasThisContext}`);
}

// 🔧 FUNCIÓN HELPER: Generar datos de ejemplo mejorados
function getSampleDataEnhanced(templateName: string): any {
  try {
    // Buscar archivo JSON con el mismo nombre que el template
    const samplePath = path.join(__dirname, '../../templates', `${templateName}.json`);

    if (fs.existsSync(samplePath)) {
      const sampleData = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
      console.log(`📊 Datos de ejemplo cargados desde: ${templateName}.json`);
      
      // 🔧 MEJORAR: Validar que los datos contengan arrays con {{this}}
      validateAndEnhanceSampleData(sampleData);
      
      return sampleData;
    } else {
      console.warn(`⚠️ No se encontró archivo de ejemplo: ${templateName}.json, usando datos básicos`);

      // Fallback a datos básicos mejorados
      return {
        fecha: new Date().toISOString().split('T')[0],
        cliente: `CLIENTE EJEMPLO - ${templateName.toUpperCase()}`,
        descripcion: `Datos de ejemplo para template ${templateName}`,
        
        // 🎯 AGREGAR EJEMPLOS DE OBJETOS ANIDADOS
        facility: {
          name: "Empresa Ejemplo S.A.",
          address: "Dirección de Ejemplo 123",
          city: "Ciudad Ejemplo",
          region: "Región Ejemplo",
          country: "País Ejemplo",
          rut: "12.345.678-9"
        },

        // 🎯 AGREGAR EJEMPLOS DE ARRAYS CON {{this}}
        testResults: [
          {
            testName: "Prueba 1",
            acceptableRange: "0-100",
            values: ["85", "90", "88"] // Array que requiere {{this}}
          },
          {
            testName: "Prueba 2", 
            acceptableRange: "1-10",
            values: ["5", "7", "6"] // Array que requiere {{this}}
          }
        ],

        firma: "Responsable del Área",
        nota: `Datos de ejemplo generados para ${templateName}`
      };
    }
  } catch (error: any) {
    console.error(`❌ Error leyendo datos de ejemplo para ${templateName}: ${error.message}`);

    // Fallback en caso de error
    return {
      fecha: new Date().toISOString().split('T')[0],
      cliente: "CLIENTE DE PRUEBA",
      error: `No se pudieron cargar los datos de ejemplo: ${error.message}`
    };
  }
}

// 🔧 NUEVA FUNCIÓN: Validar y mejorar datos de ejemplo
function validateAndEnhanceSampleData(data: any) {
  console.log('🔧 Validando estructura de datos de ejemplo...');

  // Buscar arrays que podrían necesitar {{this}}
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(itemKey => {
            const itemValue = item[itemKey];
            
            if (Array.isArray(itemValue)) {
              const isStringArray = itemValue.every(v => typeof v === 'string');
              if (isStringArray) {
                console.log(`  ✅ Array de strings detectado: ${key}[${index}].${itemKey} - requerirá {{this}}`);
              }
            }
          });
        }
      });
    }
  });
}

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
    logger.info(`[Request ID: ${requestId}] Iniciando generación de PDF con template: ${templateName} (autenticado) | Referer: ${referer} | IP: ${ip}`);

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