import { Router } from "express";
import generatePDF from "../services/pdfGenerator";
import logger from "../services/logger";
import { validateToken } from "../middleware/auth";
import path from "path";
import fs from "fs";

const router = Router();

// ================================
// UTILIDADES BÁSICAS
// ================================

const templateExists = (templateName: string): boolean => {
  const templatePath = path.join(
    __dirname,
    "../../templates",
    `${templateName}.hbs`
  );
  return fs.existsSync(templatePath);
};

// ================================
// 🎯 ANÁLISIS SIMPLIFICADO - ENFOCADO EN ARRAYS RENOMBRADOS
// ================================

function analyzeJSONStructure(data: any) {
  const result = {
    normalVariables: [] as string[],
    conditionalVariables: [] as string[],
    arrayInfo: [] as any[],
    loops: [] as string[],
    allVariables: [] as string[],
  };

  if (!data || typeof data !== "object") {
    return result;
  }

  console.log("🎯 Análisis simplificado para arrays renombrados...");

  // Procesar cada propiedad del JSON
  Object.keys(data).forEach((key) => {
    const value = data[key];

    if (Array.isArray(value)) {
      // 📋 ARRAY DETECTADO
      const arrayInfo = analyzeArraySimple(key, value);
      result.arrayInfo.push(arrayInfo);
      result.loops.push(`each ${key}`);

      console.log(
        `✅ Array procesado: ${key} (${value.length} items, ${arrayInfo.nestedArrays.length} subarrays)`
      );
    } else if (typeof value === "boolean") {
      // 🔘 VARIABLE CONDICIONAL
      result.conditionalVariables.push(key);
    } else if (typeof value === "object" && value !== null) {
      // 🏗️ OBJETO ANIDADO
      Object.keys(value).forEach((nestedKey) => {
        result.normalVariables.push(`${key}.${nestedKey}`);
      });
      result.normalVariables.push(key);
    } else {
      // 📝 VARIABLE SIMPLE
      result.normalVariables.push(key);
    }
  });

  // Limpiar duplicados
  result.normalVariables = [...new Set(result.normalVariables)].sort();
  result.conditionalVariables = [
    ...new Set(result.conditionalVariables),
  ].sort();
  result.allVariables = [
    ...result.normalVariables,
    ...result.conditionalVariables,
  ];

  console.log(
    `🎯 Análisis completado: ${result.arrayInfo.length} arrays, ${result.normalVariables.length} variables`
  );

  return result;
}

// 🔍 ANÁLISIS SIMPLE DE ARRAYS
function analyzeArraySimple(arrayName: string, arrayData: any[]) {
  const info = {
    name: arrayName,
    variables: [] as string[],
    nestedArrays: [] as any[],
  };

  if (arrayData.length === 0) {
    return info;
  }

  const firstItem = arrayData[0];

  if (typeof firstItem === "string" || typeof firstItem === "number") {
    // Array de primitivos
    info.variables = ["this"];
  } else if (typeof firstItem === "object" && firstItem !== null) {
    // Array de objetos - analizar propiedades
    Object.keys(firstItem).forEach((key) => {
      const value = firstItem[key];

      if (Array.isArray(value)) {
        // 🎯 ARRAY ANIDADO DETECTADO - CON NUEVOS NOMBRES
        const nestedInfo = {
          name: key, // testValues, microResults, contaminantValues, etc.
          variables: ["this"], // Estos siempre usan {{this}}
        };
        info.nestedArrays.push(nestedInfo);

        console.log(
          `  🔍 Array anidado encontrado: ${arrayName}.${key} (${value.length} valores)`
        );
      } else {
        // Propiedad normal
        info.variables.push(key);
      }
    });
  }

  return info;
}

// ================================
// 📝 DATOS DE EJEMPLO MEJORADOS
// ================================

function getSampleData(templateName: string): any {
  try {
    const samplePath = path.join(
      __dirname,
      "../../templates",
      `${templateName}.json`
    );

    if (fs.existsSync(samplePath)) {
      const sampleData = JSON.parse(fs.readFileSync(samplePath, "utf-8"));
      console.log(`📊 Datos de ejemplo cargados: ${templateName}.json`);
      return sampleData;
    } else {
      console.log(`📝 Generando datos de ejemplo para: ${templateName}`);
    }
  } catch (error: any) {
    console.error(`❌ Error leyendo datos: ${error.message}`);
  }
}

// ================================
// 🔒 ENDPOINTS OPTIMIZADOS
// ================================

// 📋 Lista de templates
router.post("/templates", validateToken, async (req, res) => {
  const requestId = (req as any).requestId || "no-id";
  const ip = req.ip || req.connection.remoteAddress || "-";

  try {
    logger.info(`[${requestId}] Solicitando templates | IP: ${ip}`);

    const templatesDir = path.join(__dirname, "../../templates");

    if (!fs.existsSync(templatesDir)) {
      throw new Error("Directorio de templates no encontrado");
    }

    const files = fs.readdirSync(templatesDir);
    const templates = files
      .filter((file) => file.endsWith(".hbs"))
      .map((file) => {
        const name = file.replace(".hbs", "");
        const filePath = path.join(templatesDir, file);
        const stats = fs.statSync(filePath);
        const jsonPath = path.join(templatesDir, `${name}.json`);

        return {
          name: name,
          file: file,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          hasExample: fs.existsSync(jsonPath),
        };
      });

    res.status(200).json({
      success: true,
      templates: templates,
      count: templates.length,
      requestId: requestId,
    });

    logger.info(
      `[${requestId}] ${templates.length} templates enviados | IP: ${ip}`
    );
  } catch (error: any) {
    logger.error(
      `[${requestId}] Error obteniendo templates: ${error.message} | IP: ${ip}`
    );

    res.status(500).json({
      error: true,
      message: "Error obteniendo lista de templates: " + error.message,
      requestId: requestId,
    });
  }
});

// 📄 Template específico con análisis optimizado
router.post("/templates/:templateName", validateToken, async (req, res) => {
  const templateName = req.params.templateName;
  const requestId = (req as any).requestId || "no-id";
  const ip = req.ip || req.connection.remoteAddress || "-";

  try {
    logger.info(
      `[${requestId}] Solicitando template: ${templateName} | IP: ${ip}`
    );

    if (!templateExists(templateName)) {
      logger.warn(
        `[${requestId}] Template no encontrado: ${templateName} | IP: ${ip}`
      );
      return res.status(404).json({
        error: true,
        message: `Template '${templateName}' no encontrado`,
        requestId: requestId,
      });
    }

    // Cargar template
    const templatePath = path.join(
      __dirname,
      "../../templates",
      `${templateName}.hbs`
    );
    const templateContent = fs.readFileSync(templatePath, "utf-8");
    const stats = fs.statSync(templatePath);

    // 🎯 ANÁLISIS OPTIMIZADO
    const sampleData = getSampleData(templateName);
    const analyzedStructure = analyzeJSONStructure(sampleData);

    // Respuesta optimizada
    res.status(200).json({
      success: true,
      template: {
        name: templateName,
        content: templateContent,

        // Estructura analizada (simplificada)
        normalVariables: analyzedStructure.normalVariables,
        conditionalVariables: analyzedStructure.conditionalVariables,
        arrayInfo: analyzedStructure.arrayInfo,
        loops: analyzedStructure.loops,
        allVariables: analyzedStructure.allVariables,

        // Datos de ejemplo
        sampleData: sampleData,
        size: stats.size,
        modified: stats.mtime.toISOString(),
      },
      requestId: requestId,
    });

    logger.info(`[${requestId}] Template enviado: ${templateName} | IP: ${ip}`);
  } catch (error: any) {
    logger.error(
      `[${requestId}] Error obteniendo template ${templateName}: ${error.message} | IP: ${ip}`
    );

    res.status(500).json({
      error: true,
      message: "Error obteniendo template: " + error.message,
      requestId: requestId,
    });
  }
});

// 📄 Generar PDF optimizado
router.post("/pdf/view", validateToken, async (req, res) => {
  const templateName = req.query.template as string;
  const data = req.body;
  const requestId = (req as any).requestId || "no-id";
  const referer = req.get("referer") || "-";
  const ip = req.ip || req.connection.remoteAddress || "-";

  if (!templateName || templateName.trim() === "") {
    logger.warn(`[${requestId}] Template no proporcionado | IP: ${ip}`);
    return res.status(400).json({
      error: true,
      message: "El parámetro template es obligatorio",
      requestId: requestId,
    });
  }

  if (!templateExists(templateName)) {
    logger.error(
      `[${requestId}] Template no encontrado: ${templateName} | IP: ${ip}`
    );
    return res.status(404).json({
      error: true,
      message: `Template \"${templateName}\" no encontrado`,
      requestId: requestId,
    });
  }

  try {
    logger.info(`[${requestId}] Generando PDF: ${templateName} | IP: ${ip}`);

    const requestInfo = { ip, referer, requestId };
    const result = await generatePDF(templateName, data, requestInfo);

    // Enviar PDF
    res.contentType("application/pdf");
    res.send(result.pdfBuffer);

    logger.info(
      `[${requestId}] PDF generado exitosamente: ${templateName} | DocumentID: ${result.documentId} | IP: ${ip}`
    );
  } catch (error: any) {
    logger.error(
      `[${requestId}] Error generando PDF: ${error.message} | IP: ${ip}`
    );

    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || "Error interno del servidor",
      requestId: requestId,
    });
  }
});

// 🔍 Verificar y acceder a documento
router.get("/verify/:documentId", async (req, res) => {
  const { documentId } = req.params;
  const ip = req.ip || req.connection.remoteAddress || "-";

  try {
    const documentPath = path.join(__dirname, "../../templates/documents", `${documentId}.pdf`);
    
    if (!fs.existsSync(documentPath)) {
      logger.warn(`Documento no encontrado: ${documentId} | IP: ${ip}`);
      return res.status(404).json({
        error: true,
        message: "Documento no encontrado",
        documentId
      });
    }

    // Enviar el PDF
    res.contentType("application/pdf");
    res.sendFile(documentPath);

    logger.info(`Documento verificado y enviado: ${documentId} | IP: ${ip}`);
  } catch (error: any) {
    logger.error(`Error verificando documento ${documentId}: ${error.message} | IP: ${ip}`);
    
    res.status(500).json({
      error: true,
      message: "Error al acceder al documento",
      documentId
    });
  }
});

// ================================
// ENDPOINT: Listar documentos autenticados
// ================================
router.get('/documents/list', async (req, res) => {
  try {
    const documentsDir = path.join(__dirname, '../../templates/documents');
    if (!fs.existsSync(documentsDir)) {
      return res.status(200).json({ documents: [] });
    }
    const files = fs.readdirSync(documentsDir)
      .filter(f => f.endsWith('.pdf'));
    const baseUrl = process.env.API_URL || 'http://localhost:3331';
    const documents = files.map(filename => {
      const filePath = path.join(documentsDir, filename);
      const stats = fs.statSync(filePath);
      const documentId = filename.replace('.pdf', '');
      return {
        filename,
        documentId,
        size: stats.size,
        created: stats.mtime.toISOString(),
        modified: stats.mtime.toISOString(),
        downloadUrl: `${baseUrl}/api/verify/${documentId}`,
        verifyUrl: `${baseUrl}/api/verify/${documentId}`
      };
    });
    res.status(200).json({ documents });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error listando documentos', details: (error as any).message });
  }
});

export default router;