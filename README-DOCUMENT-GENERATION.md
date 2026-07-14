# Document Generation System

This system allows you to generate Word documents (.docx) from templates when certificates/carnets are downloaded.

## Features

- **3 Document Types**: Certificación de Competencias, Nota de Entrega, Validación de Datos
- **Template-Based**: Uses .docx templates with variable placeholders
- **Auto-Population**: Automatically fills participant data from certificates
- **Download API**: RESTful API for document generation
- **React Components**: Ready-to-use UI components

## Installation

The required dependencies are already installed:
- `docxtemplater` - Template processing engine
- `pizzip` - ZIP file handling for .docx files

## Template Variables

Your templates use `{{variable}}` syntax. Available variables:

### Basic Information
- `{{fecha}}` - Current date (formatted as "30 de marzo de 2026")
- `{{nombre_cliente}}` - Client company name
- `{{titulo_curso}}` - Course title
- `{{ciudad}}` - City
- `{{dia}}` - Day of month
- `{{mes}}` - Month name
- `{{anio}}` - Year
- `{{nro_osi}}` - OSI number

### Signatory Information
- `{{nombre_firmante}}` - Signatory name
- `{{cargo_firmante}}` - Signatory position
- `{{nombre_recibido}}` - Recipient name (for Nota de Entrega)
- `{{cargo_recibido}}` - Recipient position (for Nota de Entrega)

### Location Information
- `{{localidad}}` - General location
- `{{localidad_cliente}}` - Client location
- `{{fecha_ejecucion}}` - Course execution date(s)

### Participant Table Loop
```html
{{#participantes}}
{{index}}	{{nombre_apellido}}	{{cedula}}	{{puntuacion}}	{{condicion}}	{{numero_control}}
{{/participantes}}
```

## Usage

### 1. API Endpoint

```javascript
POST /api/generate-document

{
  "certificates": [...],
  "osiData": {...},
  "firmanteData": {...},
  "recibidoData": {...},
  "documentType": "certificacion_competencias"
}
```

### 2. React Component

```tsx
import { DocumentDownloader } from '@/components/documents/document-downloader';

<DocumentDownloader
  certificates={certificates}
  osiData={osiData}
  firmanteData={firmanteData}
  recibidoData={recibidoData}
/>
```

### 3. Server-Side Generation

```typescript
import { DocumentGenerator } from '@/lib/document-generator';

const generator = new DocumentGenerator();
const buffer = await generator.generateSingleDocument(
  'certificacion_competencias',
  certificates,
  osiData,
  firmanteData
);
```

## Integration Steps

### Step 1: Add to Certificate Generation Page

```tsx
import { DocumentGenerationSection } from '@/lib/document-integration-example';

// In your certificate generation component, after certificates are created:
<DocumentGenerationSection 
  certificates={generatedCertificates} 
  osiData={osiData} 
/>
```

### Step 2: Update Certificate Generation Action

```typescript
import { generateCertificatesWithDocuments } from '@/lib/document-integration-example';

const result = await generateCertificatesWithDocuments(
  participantData,
  osiData,
  courseData,
  {
    generateDocuments: true,
    documentOptions: {
      includeCertificacionCompetencias: true,
      includeNotaEntrega: true,
      includeValidacionDatos: true
    }
  }
);
```

## File Structure

```
lib/
├── document-templates.ts      # Core template processing
├── document-generator.ts       # Helper utilities
└── document-integration-example.tsx  # Integration examples

components/documents/
└── document-downloader.tsx     # React UI component

app/api/
└── generate-document/
    └── route.ts                 # API endpoint

public/templates/
├── certificacion_de_competencias.docx
├── nota_de_entrega.docx
└── validacion_de_datos.docx
```

## Data Flow

1. **Certificate Generation** → Creates certificate records with participant data
2. **Template Processing** → Extracts data and prepares template variables
3. **Document Generation** → Fills .docx templates with data
4. **Download** → User downloads generated documents

## Error Handling

- Templates are validated before processing
- Missing required data shows clear error messages
- Document generation failures don't break certificate creation
- API returns detailed error information

## Customization

### Adding New Document Types

1. Create new .docx template in `public/templates/`
2. Add generation method in `DocumentTemplateProcessor`
3. Update API route switch statement
4. Add to `DocumentDownloader` component

### Custom Variables

Add new variables to `TemplateData` interface and update `prepareTemplateData` method.

### Styling

Templates maintain all Word formatting, including:
- Fonts, colors, sizes
- Tables, borders, spacing
- Headers, footers
- Images, logos

## Testing

```bash
# Test API endpoint
curl -X POST http://localhost:3000/api/generate-document \
  -H "Content-Type: application/json" \
  -d '{"certificates":[],"osiData":{},"firmanteData":{},"documentType":"certificacion_competencias"}'
```

## Performance

- Templates are loaded once per request
- Memory-efficient streaming for large documents
- Caching can be added for frequently used templates
- Async processing prevents blocking

## Security

- Template files are server-side only
- No user-uploaded templates
- Input validation on all data
- Safe file download headers
