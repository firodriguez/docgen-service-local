import { Request, Response, NextFunction } from 'express';
import logger from '../services/logger';

// Middleware para validar token en el body o en el header Authorization
export const validateToken = (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as any).requestId || 'no-id';
    const ip = req.ip || req.connection.remoteAddress || '-';
    const referer = req.get('referer') || '-';

    // 1. Token desde el body (config.token)
    const { config } = req.body;
    let providedToken = config?.token;

    // 2. Token desde el header Authorization
    if (!providedToken) {
        const authHeader = req.get('Authorization');
        if (authHeader) {
            // Permitir formato "Bearer <token>" o solo "<token>"
            providedToken = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7).trim()
                : authHeader.trim();
        }
    }

    // Token esperado desde variables de entorno
    const expectedToken = process.env.API_TOKEN;

    // Validar que existe el token en variables de entorno
    if (!expectedToken) {
        logger.error(`[Request ID: ${requestId}] API_TOKEN no configurado en variables de entorno | IP: ${ip}`);
        return res.status(500).json({
            error: true,
            message: 'Error de configuración del servidor.',
            requestId: requestId
        });
    }

    // Validar que se proporcionó un token
    if (!providedToken) {
        logger.warn(`[Request ID: ${requestId}] Token no proporcionado en config.token ni en Authorization | IP: ${ip} | Referer: ${referer}`);
        return res.status(401).json({
            error: true,
            message: 'Token de autenticación requerido en config.token o en el header Authorization',
            requestId: requestId
        });
    }

    // Validar que el token sea correcto
    if (providedToken !== expectedToken) {
        logger.warn(`[Request ID: ${requestId}] Token inválido proporcionado | IP: ${ip} | Referer: ${referer} | Token: ${providedToken.substring(0, 10)}...`);
        return res.status(403).json({
            error: true,
            message: 'Token de autenticación inválido.',
            requestId: requestId
        });
    }

    // Token válido - eliminar config del body para no pasarlo al template
    if (config?.token) delete req.body.config;

    // Log de autenticación exitosa
    logger.info(`[Request ID: ${requestId}] Token válido - Acceso autorizado | IP: ${ip}`);

    next();
};

// Middleware opcional para endpoints que no requieren autenticación
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
    const { config } = req.body;

    // Si no hay config, continuar sin autenticación
    if (!config?.token) {
        return next();
    }

    // Si hay token, validarlo
    return validateToken(req, res, next);
};