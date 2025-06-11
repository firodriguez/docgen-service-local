import { config } from 'dotenv';

// Cargar TODAS las variables de entorno desde .env.test
config({ path: '.env.test' });

// Mock básico de console para mantener logs en tests (opcional)
const originalConsole = console;
global.console = {
    ...originalConsole,
    log: originalConsole.log,
    info: originalConsole.info,
    warn: originalConsole.warn,
    error: originalConsole.error,
};