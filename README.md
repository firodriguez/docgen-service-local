# 📄 Surfrut PDF Generator Service

Servicio profesional de generación de PDFs basado en plantillas Handlebars. Microservicio diseñado para integraciones empresariales con ERPs, CRMs y sistemas externos.

## 🚀 Características

- ✅ **Web Service PDF** para integraciones empresariales
- ✅ **Generación de PDFs** con Puppeteer y Handlebars
- ✅ **Templates dinámicos** con hot-reload
- ✅ **API REST** para consumo desde cualquier sistema
- ✅ **Autenticación** con tokens
- ✅ **Logging profesional** con Winston y tracking
- ✅ **Assets estáticos** (logos, imágenes, CSS)
- ✅ **Health checks** para monitoreo
- ✅ **Docker** para desarrollo y producción
- ✅ **Error tracking** con IPs y request IDs

## 🏗️ Arquitectura

```
Sistema ERP/CRM/App → POST → PDF Service
                            ↓
                    Docker Container
                    Node.js + Express + Puppeteer
                            ↓
                    ← PDF Binary Response
```

**Casos de uso:**
- 🏭 **ERP QAD** → Generar documento PDF
- 📊 **Sistemas CRM** → Reportes y cotizaciones
- 🌐 **Apps Web** → Documentos dinámicos
- 🔗 **iframes** → Visualización directa

## 🛠️ Desarrollo Local

### Prerrequisitos

- Docker & Docker Compose
- Node.js 18+ (opcional, para desarrollo sin Docker)
- Git

### 1. Clonar repositorio

```bash
git clone <repository-url>
cd docgen-service
```

### 2. Configurar variables de entorno

Crear archivo `.env` en la raíz:

```bash
# .env - DESARROLLO
NODE_ENV=development
PORT=3000
API_TOKEN=1234

# Puppeteer (Docker)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Timezone
TZ=America/Santiago

# Logs (opcional)
LOG_CONSOLE=true
```

### 3. Levantar servicio con Docker

```bash
# Crear carpeta logs con permisos
mkdir -p logs
sudo chmod 777 logs

# Levantar container
docker-compose up -d --build

# Ver logs en tiempo real
docker-compose logs -f docgen-service
tail -f logs/combined.log
```

### 4. Verificar funcionamiento

```bash
# Health check
curl http://localhost:3331/api/health

# Generar PDF de prueba
curl -X POST "http://localhost:3331/api/pdf/view?template=proforma" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2025-06-11",
    "cliente": "Cliente Test",
    "config": {"token": "1234"}
  }' \
  --output test.pdf
```

## 🎯 Integraciones Empresariales

### Desde sistemas ERP (QAD, SAP, etc.)

```javascript
// Ejemplo desde cualquier sistema backend
const response = await fetch('https://generate.surfrut.com/api/pdf/view?template=proforma', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    numero: 'F-001',
    cliente: 'Empresa XYZ',
    fecha: '2025-06-11',
    items: [
      { producto: 'Producto A', cantidad: 10, precio: 1500 },
      { producto: 'Producto B', cantidad: 5, precio: 2000 }
    ],
    config: { token: 'tu-token-aqui' }
  })
});

const pdfBuffer = await response.blob();
// Usar PDF: guardar, enviar email, mostrar, etc.
```

### Desde Python/PHP/Java

```python
# Python example
import requests

pdf_response = requests.post(
    'https://generate.surfrut.com/api/pdf/view?template=proforma',
    json={
        'cliente': 'Empresa ABC',
        'items': [...],
        'config': {'token': 'mi-token'}
    }
)

# Guardar PDF
with open('cotizacion.pdf', 'wb') as f:
    f.write(pdf_response.content)

# O enviar por email
send_email_with_attachment(pdf_response.content)
```

```php
<?php
// PHP example
$data = json_encode([
    'cliente' => 'Empresa ABC',
    'fecha' => date('Y-m-d'),
    'config' => ['token' => 'mi-token']
]);

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => $data
    ]
]);

$pdf = file_get_contents(
    'https://generate.surfrut.com/api/pdf/view?template=proforma', 
    false, 
    $context
);

file_put_contents('factura.pdf', $pdf);
?>
```

```
docgen-service/
├── src/
│   ├── config/
│   │   └── express.ts           # Configuración Express
│   ├── middleware/
│   │   └── auth.ts              # Autenticación por token
│   ├── routes/
│   │   ├── healthRoutes.ts      # Health checks
│   │   └── pdfRoutes.ts         # Generación de PDFs
│   ├── services/
│   │   ├── logger.ts            # Winston logger
│   │   └── pdfGenerator.ts      # Puppeteer PDF generation
│   └── index.ts                 # Entry point
├── templates/
│   └── proforma.hbs            # Plantillas Handlebars
├── assets/
│   └── logos/
│       └── surfrut.png         # Assets estáticos
├── logs/                       # Logs persistentes
│   ├── combined.log
│   └── error.log
├── tests/                      # Tests con Jest
│   ├── setup.ts               # Configuración de tests
│   └── pdf.test.ts            # Tests principales
├── coverage/                  # Coverage reports (generado)
├── jest.config.js             # Configuración Jest
├── .env.test                  # Variables para tests
├── docker-compose.yml          # Desarrollo
├── Dockerfile
├── .env                        # Variables desarrollo
└── README.md
```

## 🎯 API Endpoints

### Health Check

```bash
GET /api/health
# Respuesta: {"status": "healthy", "timestamp": "...", ...}

GET /api/health/detailed
# Respuesta con información detallada del sistema
```

### Generar PDF

```bash
POST /api/pdf/view?template=<nombre>
Content-Type: application/json

{
  "fecha": "2025-06-11",
  "cliente": "Cliente Ejemplo",
  "items": [...],
  "config": {
    "token": "tu-token-aqui"
  }
}
```

**Parámetros:**
- `template` (query): Nombre del template (ej: `proforma`)
- `config.token` (body): Token de autenticación
- Resto del body: Variables para el template

### Assets Estáticos

```bash
GET /assets/logos/surfrut.png
# Sirve archivos desde ./assets/
```

## 🔧 Templates

Los templates usan **Handlebars** y están en `./templates/`:

```handlebars
<!-- templates/proforma.hbs -->
<!DOCTYPE html>
<html>
<head>
    <title>Proforma - {{cliente}}</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .logo { text-align: center; }
    </style>
</head>
<body>
    <div class="logo">
        <img src="/assets/logos/surfrut.png" alt="Surfrut" width="200">
    </div>
    
    <h1>Proforma para {{cliente}}</h1>
    <p>Fecha: {{fecha}}</p>
    
    {{#each items}}
        <div>{{nombre}}: {{precio}}</div>
    {{/each}}
</body>
</html>
```

## 📊 Logging

El servicio genera logs estructurados:

```bash
# Ver logs en tiempo real
tail -f logs/combined.log
tail -f logs/error.log

# Logs de PDFs generados
tail -f logs/combined.log | grep "PDF generado"

# Logs con tracking de IPs
tail -f logs/combined.log | grep "IP:"
```

### Ejemplo de logs

```json
{
  "timestamp": "2025-06-11 11:30:45",
  "level": "info", 
  "message": "⚡ PDF generado en 850ms | Template: proforma | IP: 203.0.113.100 | Referer: https://app.surfrut.com | RequestID: abc-123"
}
```

## 🧪 Testing

El proyecto incluye tests completos con Jest:

### Ejecutar tests

```bash
# Todos los tests
npm test

# Tests en modo watch (para desarrollo)
npm run test:watch

# Tests con coverage report
npm run test:coverage

# Tests para CI/CD (sin watch)
npm run test:ci
```

### Coverage de tests

Los tests cubren:

- ✅ **Autenticación** - Validación de tokens
- ✅ **Validaciones** - Templates, parámetros obligatorios
- ✅ **Health checks** - Endpoints de monitoreo
- ✅ **Error handling** - Manejo de errores y responses
- ✅ **Security** - Rutas protegidas y no autorizadas
- ✅ **PDF generation** - Generación en entorno Docker

### Configuración para tests

Crear archivo `.env.test`:

```bash
# .env.test
NODE_ENV=test
PORT=3000
API_TOKEN=1234
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
TZ=America/Santiago
SILENT_TESTS=true
```

## 🔒 Seguridad

- ✅ **Autenticación por token** requerida
- ✅ **IP tracking** en todos los logs
- ✅ **Request IDs** únicos para trazabilidad
- ✅ **HTTPS** en producción
- ✅ **Rate limiting** por Docker resources
- ✅ **Error handling** sin exposición de stack traces

## 🐳 Docker

### Desarrollo

```bash
# Levantar
docker-compose up -d --build

# Logs
docker-compose logs -f

# Entrar al container
docker-compose exec docgen-service bash

# Parar
docker-compose down

```

## 🛠️ Desarrollo sin Docker

Si prefieres desarrollar directamente con Node.js:

```bash
# Instalar dependencias
npm install

# Desarrollo con hot-reload
npm run dev

# Tests
npm test
npm run test:watch
npm run test:coverage

# Producción
npm run build
npm start
```

**Nota:** Necesitarás Chrome/Chromium instalado para Puppeteer.

## ❗ Troubleshooting

### PDFs no se generan

1. Verificar que Chromium esté disponible:
   ```bash
   docker-compose exec docgen-service /usr/bin/chromium --version
   ```

2. Verificar logs:
   ```bash
   docker-compose logs docgen-service
   tail -f logs/error.log
   ```

### Tests fallan

1. Verificar variables de entorno para tests:
   ```bash
   cat .env.test
   ```

2. Ejecutar tests específicos:
   ```bash
   npm test -- --testNamePattern="Health"
   npm test -- --verbose
   ```

3. Ver coverage detallado:
   ```bash
   npm run test:coverage
   open coverage/lcov-report/index.html
   ```

### Logs no se guardan

1. Verificar permisos:
   ```bash
   ls -la logs/
   sudo chmod 777 logs
   ```

2. Verificar volumen Docker:
   ```bash
   docker-compose exec docgen-service ls -la /app/logs/
   ```

### Assets no cargan

1. Verificar ruta:
   ```bash
   curl http://localhost:3331/assets/logos/surfrut.png
   ```

2. Verificar archivos:
   ```bash
   ls -la assets/logos/
   ```

## 🚀 URLs de Servicio

- **Health Check:** `https://generate.surfrut.com/api/health`
- **PDF Generation:** `https://generate.surfrut.com/api/pdf/view?template=<nombre>`
- **Assets:** `https://generate.surfrut.com/assets/logos/surfrut.png`

## 📬 Contacto

Desarrollado por el equipo de tecnología de **Surfrut**  
📧 frodriguez@surfrut.com