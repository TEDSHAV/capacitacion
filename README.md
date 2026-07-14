# Sistema de Gestión de Capacitación y Certificación

Una aplicación web moderna para la gestión completa de capacitaciones, generación de certificados y carnets, con sistema de verificación por códigos QR.

## Características Principales

### Gestión de Capacitaciones
- **Administración de Cursos**: Creación y gestión de cursos con contenido, duración y notas de aprobación
- **Gestión de OSI**: Orden de Servicio de Instrucción con relación directa a cursos
- **Asignación de Facilitadores**: Gestión de instructores y su asignación a cursos/capacitaciones
- **Control de Participantes**: Registro y seguimiento de participantes 

### Generación de Documentos
- **Certificados PDF**: Generación automática con códigos QR para verificación
- **Carnets de Identificación**: Creación de carnets con fotos y datos de participantes
- **Documentos Word**: Generación de Certificación de Competencias, Nota de Entrega y Validación de Datos
- **Plantillas Personalizables**: Sistema basado en plantillas para documentos

### Sistema de Verificación
- **Códigos QR**: Cada certificado incluye un QR único para verificación
- **Página de Verificación**: Verificación en línea de autenticidad de certificados
- **API de Verificación**: Endpoints para verificación programática

### Reportes y Analíticas
- **Reportes por Tema**: Análisis de certificados emitidos por curso
- **Números de Control**: Sistema de numeración (libro, folio, línea, control)
- **Estadísticas de Participación**: Métricas de uso y participación

## Arquitectura Tecnológica

### Frontend
- **Next.js 15+**: Framework React con renderizado del lado del servidor
- **TypeScript**: Tipado estático para mayor robustez
- **Tailwind CSS**: Framework de CSS para diseño moderno
- **Lucide React**: Iconos modernos y consistentes

### Backend
- **Supabase**: Base de datos PostgreSQL y autenticación
- **API Routes**: Endpoints RESTful para operaciones CRUD
- **Server Actions**: Acciones del servidor para operaciones seguras

### Librerías Especializadas
- **jsPDF**: Generación de documentos PDF
- **QRCode**: Generación de códigos QR
- **docxtemplater**: Procesamiento de plantillas Word
- **React Query**: Gestión de estado y caché de datos

## Estructura del Proyecto

```
app/
  (auth)/                    # Autenticación de usuarios
    login/
  actions/                   # Server Actions
    auth.ts
    carnets.ts
    certificados.ts
  api/                       # API Routes
    carnets/
    certificates/
    verify-certificate/
  dashboard/                 # Panel de administración
    capacitacion/
      gestion-cursos/
      generacion-certificado/
      reportes/
    negocios/
      gestion-de-osis/
      gestion-clientes/
  verify-certificate/        # Página de verificación

components/
  carnets/                   # Componentes de carnets
  documents/                 # Componentes de documentos
  performance/               # Optimización de rendimiento
  providers/                 # Proveedores de contexto

lib/                        # Utilidades y servicios
  carnet-generator.ts
  certificate-generator.ts
  qr-service.ts
  document-templates.ts

types/                      # Definiciones de TypeScript
  index.ts
  supabase.ts
```

## Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- Cuenta de Supabase

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd nextjs-capacitacion-module

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
```

### Configuración de Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Actualización de Tipos de Base de Datos
```bash
npm run update-types
```

## Uso

### Iniciar Desarrollo
```bash
npm run dev
```
Visita [http://localhost:3000](http://localhost:3000) para ver la aplicación.

### Flujo de Trabajo Típico

1. **Crear Cliente**: Registrar empresa cliente en el sistema
2. **Generar OSI**: Crear Orden de Servicio de Instrucción
3. **Asignar Curso**: Seleccionar curso de la base de datos o crear nuevo
4. **Registrar Participantes**: Agregar participantes al curso
5. **Generar Certificados**: Emitir certificados con códigos QR
6. **Verificar**: Escanear QR para verificar autenticidad

## Características Técnicas Destacadas

### Optimización de Rendimiento
- **Memoización**: Componentes optimizados con React.memo
- **Lazy Loading**: Carga diferida de imágenes y componentes
- **Virtualized Lists**: Para grandes conjuntos de datos
- **Debounced Search**: Búsqueda optimizada con retraso

### Seguridad
- **Autenticación**: Sistema de login seguro con Supabase
- **Validación**: Validación de datos en cliente y servidor
- **Control de Acceso**: Rutas protegidas por middleware

### Calidad de Código
- **TypeScript**: Tipado estricto para mayor seguridad
- **ESLint**: Configuración de linting para código limpio
- **Componentes Reutilizables**: Arquitectura modular

## Documentos Generados

### Certificados
- PDF con diseño profesional
- Código QR de verificación
- Firmas digitales
- Numeración de control

### Carnets
- Diseño personalizable
- Fotos de participantes
- Información de contacto
- Validación por QR

### Documentos Word
- Certificación de Competencias
- Nota de Entrega
- Validación de Datos
- Basados en plantillas personalizables

## API Endpoints Principales

### Certificados
- `GET /api/certificates` - Listar certificados
- `POST /api/certificates` - Crear certificado
- `GET /api/certificates/[id]` - Obtener certificado
- `GET /api/generate-certificate-pdf/[id]` - Generar PDF

### Verificación
- `GET /api/verify-certificate/[id]` - Verificar certificado

### Documentos
- `POST /api/generate-document` - Generar documento Word

## Contribución

1. Fork del proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit de cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## Licencia

Este proyecto es propiedad privada y está licenciado bajo términos comerciales.

## Soporte

Para soporte técnico, contactar al equipo de desarrollo o revisar la documentación interna del proyecto.
