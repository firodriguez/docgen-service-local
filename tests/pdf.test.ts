import request from 'supertest';
import app from '../src/config/express';

describe('PDF Service Tests', () => {
    const validToken = process.env.API_TOKEN;

    const validPdfData = {
        nombre: 'Test User',
        cargo: 'Developer',
        fecha: '2024-01-01',
        sueldo: '1000',
        config: {
            token: validToken
        }
    };

    const validAuthBody = {
        config: {
            token: validToken
        }
    };

    describe('Authentication & Security', () => {
        it('should return 400 when template is missing', async () => {
            const response = await request(app)
                .post('/api/pdf/view')
                .send(validPdfData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(true);
            expect(response.body.message).toContain('template es obligatorio');
        });

        it('should return 401 when token is missing', async () => {
            const dataWithoutToken = {
                nombre: 'Test User',
                cargo: 'Developer'
            };

            const response = await request(app)
                .post('/api/pdf/view?template=contrato')
                .send(dataWithoutToken);

            expect(response.status).toBe(401);
            expect(response.body.error).toBe(true);
            expect(response.body.message).toContain('Token de autenticación requerido');
        });

        it('should return 403 when token is invalid', async () => {
            const dataWithInvalidToken = {
                ...validPdfData,
                config: {
                    token: 'invalid-token'
                }
            };

            const response = await request(app)
                .post('/api/pdf/view?template=contrato')
                .send(dataWithInvalidToken);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe(true);
            expect(response.body.message).toContain('Token de autenticación inválido');
        });

        it('should return 404 when template does not exist', async () => {
            const response = await request(app)
                .post('/api/pdf/view?template=nonexistent')
                .send(validPdfData);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe(true);
            expect(response.body.message).toContain('no se encuentra disponible');
        });

        it('should return 404 for the old public endpoint (security)', async () => {
            const response = await request(app)
                .post('/api/pdf/view-public?template=contrato')
                .send({
                    nombre: 'Test User',
                    cargo: 'Developer'
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe(true);
            expect(response.body.message).toContain('Ruta no encontrada');
        });
    });

    // 🆕 NUEVOS TESTS: Templates GET Endpoints
    describe('Templates GET Endpoints (Protected)', () => {
        it('should require authentication for GET /api/templates', async () => {
            const response = await request(app)
                .get('/api/templates')
                .send({}); // Sin token

            expect(response.status).toBe(401);
            expect(response.body.error).toBe(true);
            expect(response.body.message).toContain('Token de autenticación requerido');
        });

        it('should return templates list with valid token', async () => {
            const response = await request(app)
                .get('/api/templates')
                .send(validAuthBody);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.templates).toBeDefined();
            expect(Array.isArray(response.body.templates)).toBe(true);
            expect(response.body.count).toBeGreaterThanOrEqual(0);
        });

        it('should require authentication for GET /api/templates/:name', async () => {
            const response = await request(app)
                .get('/api/templates/proforma')
                .send({}); // Sin token

            expect(response.status).toBe(401);
            expect(response.body.error).toBe(true);
        });

        it('should return template details with valid token', async () => {
            const response = await request(app)
                .get('/api/templates/proforma')
                .send(validAuthBody);

            if (response.status === 200) {
                // Si el template existe
                expect(response.body.success).toBe(true);
                expect(response.body.template).toBeDefined();
                expect(response.body.template.name).toBe('proforma');
                expect(response.body.template.variables).toBeDefined();
                expect(Array.isArray(response.body.template.variables)).toBe(true);
            } else {
                // Si el template no existe (404 es válido)
                expect(response.status).toBe(404);
            }
        });

        it('should return 404 for non-existent template', async () => {
            const response = await request(app)
                .get('/api/templates/nonexistent')
                .send(validAuthBody);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe(true);
            expect(response.body.message).toContain('no encontrado');
        });

        it('should require authentication for GET /api/templates/:name/preview', async () => {
            const response = await request(app)
                .get('/api/templates/proforma/preview')
                .send({}); // Sin token

            expect(response.status).toBe(401);
            expect(response.body.error).toBe(true);
        });

        it('should return HTML preview with valid token', async () => {
            const response = await request(app)
                .get('/api/templates/proforma/preview')
                .send(validAuthBody);

            if (response.status === 200) {
                // Si el template existe
                expect(response.headers['content-type']).toContain('text/html');
                expect(typeof response.text).toBe('string');
                expect(response.text.length).toBeGreaterThan(0);
            } else {
                // Si el template no existe (404 es válido)
                expect(response.status).toBe(404);
            }
        });
    });

    describe('PDF Generation (Solo en Docker)', () => {
        it('should handle chromium not found gracefully in local development', async () => {
            const response = await request(app)
                .post('/api/pdf/view?template=contrato')
                .send(validPdfData);

            // En desarrollo local: fallará por falta de Chromium (esperado)
            // En Docker: debería funcionar correctamente
            if (process.env.NODE_ENV === 'production' && process.env.PUPPETEER_EXECUTABLE_PATH) {
                // En Docker/Producción - debería generar PDF
                expect(response.status).toBe(200);
                expect(response.headers['content-type']).toBe('application/pdf');
            } else {
                // En desarrollo local - fallará por falta de Chromium
                expect(response.status).toBe(500);
                expect(response.body.error).toBe(true);
                expect(response.body.message).toContain('Error al inicializar Puppeteer');
            }
        });
    });

    describe('Template Validation', () => {
        it('should validate template exists before processing', async () => {
            const response = await request(app)
                .post('/api/pdf/view?template=invalid-template-name')
                .send(validPdfData);

            expect(response.status).toBe(404);
            expect(response.body.error).toBe(true);
            expect(response.body.message).toContain('no se encuentra disponible');
        });

        it('should validate template parameter is not empty', async () => {
            const response = await request(app)
                .post('/api/pdf/view?template=')
                .send(validPdfData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe(true);
            expect(response.body.message).toContain('template es obligatorio');
        });
    });

    describe('Health Checks', () => {
        it('should return healthy status', async () => {
            const response = await request(app).get('/api/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('healthy');
            expect(response.body.service).toBe('docgen-service'); // ✅ Corregido nombre del servicio
        });

        it('should return detailed health info', async () => {
            const response = await request(app).get('/api/health/detailed');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('healthy');
            expect(response.body.components).toBeDefined();
            expect(response.body.components.templates).toBeDefined();
        });

        it('should return readiness status', async () => {
            const response = await request(app).get('/api/ready');

            // Puede ser 200 o 503 dependiendo de la configuración
            expect([200, 503]).toContain(response.status);
            expect(response.body.status).toBeDefined();
        });
    });

    // 🆕 TESTS DE INTEGRACIÓN: Flujo completo
    describe('Integration Tests', () => {
        it('should complete full workflow: list → get → preview → generate', async () => {
            // 1. Obtener lista de templates
            const listResponse = await request(app)
                .get('/api/templates')
                .send(validAuthBody);

            if (listResponse.status !== 200) {
                console.log('⚠️ No templates disponibles para test de integración');
                return;
            }

            const templates = listResponse.body.templates;
            if (templates.length === 0) {
                console.log('⚠️ No hay templates para testear');
                return;
            }

            const templateName = templates[0].name;

            // 2. Obtener detalles del template
            const detailResponse = await request(app)
                .get(`/api/templates/${templateName}`)
                .send(validAuthBody);

            expect(detailResponse.status).toBe(200);

            // 3. Preview del template
            const previewResponse = await request(app)
                .get(`/api/templates/${templateName}/preview`)
                .send(validAuthBody);

            expect(previewResponse.status).toBe(200);
            expect(previewResponse.headers['content-type']).toContain('text/html');

            // 4. Generar PDF (solo si no es entorno local sin Chromium)
            if (process.env.NODE_ENV === 'production' && process.env.PUPPETEER_EXECUTABLE_PATH) {
                const pdfResponse = await request(app)
                    .post(`/api/pdf/view?template=${templateName}`)
                    .send(validPdfData);

                expect(pdfResponse.status).toBe(200);
                expect(pdfResponse.headers['content-type']).toBe('application/pdf');
            }
        });
    });
});