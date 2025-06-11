// src/services/logger.ts - CONSOLA EN DESARROLLO Y PRODUCCIÓN
import { createLogger, format, transports } from 'winston';
import path from 'path';
import fs from 'fs';

const getSantiagoTime = () => {
    // ✅ FIX ROBUSTO: Usar Intl.DateTimeFormat para Santiago
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const formatted = `${parts[0].value}-${parts[2].value}-${parts[4].value} ${parts[6].value}:${parts[8].value}:${parts[10].value}`;
    
    return formatted;
};

// ✅ FIX: Ruta absoluta que funciona en desarrollo Y Docker
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// SIMPLE: Solo development vs production
const isProduction = process.env.NODE_ENV === 'production';

const logger = createLogger({
    level: isProduction ? 'info' : 'debug', // Menos logs en prod
    format: format.combine(
        format.timestamp({
            format: () => getSantiagoTime() // ✅ Ya retorna string formateado
        }),
        format.errors({ stack: true }),
        format.json()
    ),
    transports: [
        new transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: format.combine(
                format.timestamp({
                    format: () => getSantiagoTime() // ✅ Ya retorna string formateado
                }),
                format.json()
            )
        }),
        new transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: format.combine(
                format.timestamp({
                    format: () => getSantiagoTime() // ✅ Ya retorna string formateado
                }),
                format.json()
            )
        }),
        // ✅ CONSOLA SIEMPRE - Desarrollo Y Producción
        new transports.Console({
            level: isProduction ? 'info' : 'debug', // Solo info+ en producción
            format: format.combine(
                format.colorize(),
                format.timestamp({
                    format: () => getSantiagoTime() // ✅ Ya retorna string formateado
                }),
                format.printf(({ timestamp, level, message, stack }) => {
                    const emoji = isProduction ? '🚀' : '🛠️';
                    return stack
                        ? `${emoji} ${timestamp} [${level}]: ${message}\n${stack}`
                        : `${emoji} ${timestamp} [${level}]: ${message}`;
                })
            )
        })
    ],
});

export default logger;