import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Health check básico
router.get('/health', (_req: Request, res: Response) => {
    const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'docgen-service',
        version: process.env.npm_package_version || '1.0.1',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        }
    };

    res.status(200).json(healthData);
});

// Health check más detallado
router.get('/health/detailed', (_req: Request, res: Response) => {
    const templatesDir = path.join(__dirname, '../../templates');
    let templatesStatus = 'healthy';
    let availableTemplates: string[] = [];

    try {
        const files = fs.readdirSync(templatesDir);
        availableTemplates = files
            .filter(file => file.endsWith('.hbs'))
            .map(file => file.replace('.hbs', ''));
    } catch (error) {
        templatesStatus = 'error';
    }

    const detailedHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'docgen-service',
        version: process.env.npm_package_version || '1.0.1',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        system: {
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
                percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
            },
            cpu: {
                usage: process.cpuUsage()
            }
        },
        components: {
            templates: {
                status: templatesStatus,
                available: availableTemplates,
                count: availableTemplates.length
            },
            auth: {
                status: process.env.API_TOKEN ? 'configured' : 'not_configured'
            }
        }
    };

    res.status(200).json(detailedHealth);
});

// Readiness check (para Kubernetes/Docker)
router.get('/ready', (_req: Request, res: Response) => {
    // Verificar que componentes críticos estén listos
    const templatesDir = path.join(__dirname, '../../templates');
    const hasApiToken = !!process.env.API_TOKEN;

    try {
        fs.accessSync(templatesDir);

        if (!hasApiToken) {
            return res.status(503).json({
                status: 'not_ready',
                reason: 'API_TOKEN not configured'
            });
        }

        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            reason: 'Templates directory not accessible'
        });
    }
});

export default router;