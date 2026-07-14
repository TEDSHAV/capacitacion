/**
 * Snapshot Verification Utility
 * 
 * Validates that certificate and carnet snapshots contain all necessary data
 * for complete reproduction via verification links and future regeneration.
 */

import { CertificateGeneration, CertificateParticipant } from '@/types';

export interface SnapshotValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingFields: string[];
}

/**
 * Validate certificate snapshot structure
 */
export function validateCertificateSnapshot(snapshot: any): SnapshotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFields: string[] = [];

  if (!snapshot) {
    return {
      isValid: false,
      errors: ['Snapshot is null or undefined'],
      warnings,
      missingFields,
    };
  }

  // Required certificate fields
  const requiredCertificateFields = [
    'id_participante',
    'id_empresa',
    'id_curso',
    'fecha_emision',
    'fecha_vencimiento',
    'nro_osi',
    'id_estado',
    'id_facilitador',
    'id_plantilla_certificado',
    'calificacion',
    'is_active',
    'nro_libro',
    'nro_hoja',
    'nro_linea',
    'nro_control',
  ];

  // Check certificate fields
  if (!snapshot.certificado) {
    errors.push('Missing "certificado" section in snapshot');
  } else {
    for (const field of requiredCertificateFields) {
      if (!(field in snapshot.certificado)) {
        missingFields.push(`certificado.${field}`);
      }
    }
  }

  // Required participant fields
  const requiredParticipantFields = [
    'id',
    'name',
    'cedula',
    'nacionalidad',
    'score',
    'cedula_completa',
  ];

  if (!snapshot.participante) {
    errors.push('Missing "participante" section in snapshot');
  } else {
    for (const field of requiredParticipantFields) {
      if (!(field in snapshot.participante)) {
        missingFields.push(`participante.${field}`);
      }
    }
  }

  // Required certificate details fields
  const requiredDetailsFields = [
    'title',
    'subtitle',
    'course_content',
    'date',
    'location',
    'horas_estimadas',
    'passing_grade',
  ];

  if (!snapshot.certificado_detalles) {
    errors.push('Missing "certificado_detalles" section in snapshot');
  } else {
    for (const field of requiredDetailsFields) {
      if (!(field in snapshot.certificado_detalles)) {
        missingFields.push(`certificado_detalles.${field}`);
      }
    }
  }

  // Required OSI fields
  const requiredOSIFields = [
    'nro_osi',
    'cliente_nombre_empresa',
    'tema',
    'detalle_capacitacion',
    'empresa_id',
    'direccion_ejecucion',
  ];

  if (!snapshot.osi) {
    errors.push('Missing "osi" section in snapshot');
  } else {
    for (const field of requiredOSIFields) {
      if (!(field in snapshot.osi)) {
        missingFields.push(`osi.${field}`);
      }
    }
  }

  // Required course fields
  const requiredCourseFields = [
    'name',
    'id',
    'contenido',
    'nota_aprobatoria',
    'emite_carnet',
  ];

  if (!snapshot.curso) {
    errors.push('Missing "curso" section in snapshot');
  } else {
    for (const field of requiredCourseFields) {
      if (!(field in snapshot.curso)) {
        missingFields.push(`curso.${field}`);
      }
    }
  }

  // Required template fields
  if (!snapshot.plantilla) {
    errors.push('Missing "plantilla" section in snapshot');
  } else {
    if (!('id_plantilla_certificado' in snapshot.plantilla)) {
      missingFields.push('plantilla.id_plantilla_certificado');
    }
  }

  // Required signature fields
  if (!snapshot.firmas) {
    errors.push('Missing "firmas" section in snapshot');
  } else {
    if (!('facilitator_id' in snapshot.firmas)) {
      missingFields.push('firmas.facilitator_id');
    }
  }

  // Check for QR code (should be present after generation)
  if (!snapshot.qr_code) {
    warnings.push('QR code not found in snapshot (should be added after certificate generation)');
  }

  // Check for metadata
  if (!snapshot.metadatos) {
    warnings.push('Metadata section missing from snapshot');
  }

  const isValid = errors.length === 0 && missingFields.length === 0;

  return {
    isValid,
    errors,
    warnings,
    missingFields,
  };
}

/**
 * Validate carnet snapshot structure
 */
export function validateCarnetSnapshot(snapshot: any): SnapshotValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFields: string[] = [];

  if (!snapshot) {
    return {
      isValid: false,
      errors: ['Snapshot is null or undefined'],
      warnings,
      missingFields,
    };
  }

  // Required carnet fields
  const requiredFields = [
    'id_certificado',
    'id_participante',
    'id_empresa',
    'id_curso',
    'id_osi',
    'titulo_curso',
    'fecha_emision',
    'fecha_vencimiento',
    'nombre_participante',
    'cedula_participante',
    'empresa_participante',
    'nro_control',
  ];

  for (const field of requiredFields) {
    if (!(field in snapshot)) {
      missingFields.push(field);
    }
  }

  // Check for QR code
  if (!snapshot.qr_code) {
    warnings.push('QR code not found in snapshot (should be added during carnet generation)');
  }

  // Check for carnet template ID
  if (!snapshot.id_plantilla_carnet) {
    warnings.push('Carnet template ID not found in snapshot (needed for correct template reproduction)');
  }

  // Check for generation timestamp
  if (!snapshot.generated_at && !snapshot.updated_at) {
    warnings.push('Generation timestamp missing from snapshot');
  }

  const isValid = errors.length === 0 && missingFields.length === 0;

  return {
    isValid,
    errors,
    warnings,
    missingFields,
  };
}

/**
 * Verify snapshot can be used for PDF regeneration
 */
export function verifySnapshotForRegeneration(snapshot: any, type: 'certificate' | 'carnet'): SnapshotValidationResult {
  if (type === 'certificate') {
    const validation = validateCertificateSnapshot(snapshot);
    
    // Additional checks for PDF regeneration
    if (snapshot.certificado_detalles && !snapshot.certificado_detalles.title) {
      validation.errors.push('Certificate title is required for PDF generation');
    }
    
    if (snapshot.participante && !snapshot.participante.name) {
      validation.errors.push('Participant name is required for PDF generation');
    }
    
    if (snapshot.certificado_detalles && !snapshot.certificado_detalles.date) {
      validation.errors.push('Certificate date is required for PDF generation');
    }

    validation.isValid = validation.errors.length === 0;
    return validation;
  } else {
    const validation = validateCarnetSnapshot(snapshot);
    
    // Additional checks for carnet PDF regeneration
    if (!snapshot.titulo_curso) {
      validation.errors.push('Course title is required for carnet PDF generation');
    }
    
    if (!snapshot.nombre_participante) {
      validation.errors.push('Participant name is required for carnet PDF generation');
    }
    
    if (!snapshot.cedula_participante) {
      validation.errors.push('Participant ID is required for carnet PDF generation');
    }

    validation.isValid = validation.errors.length === 0;
    return validation;
  }
}

/**
 * Generate a snapshot validation report
 */
export function generateValidationReport(
  snapshot: any,
  type: 'certificate' | 'carnet',
  certificateId?: number,
): string {
  const validation = verifySnapshotForRegeneration(snapshot, type);
  
  const lines: string[] = [
    `\n=== SNAPSHOT VALIDATION REPORT ===`,
    `Type: ${type}`,
    certificateId ? `Certificate ID: ${certificateId}` : '',
    `Timestamp: ${new Date().toISOString()}`,
    `\nValidation Status: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}`,
  ];

  if (validation.errors.length > 0) {
    lines.push(`\n❌ ERRORS (${validation.errors.length}):`);
    validation.errors.forEach(err => lines.push(`  - ${err}`));
  }

  if (validation.missingFields.length > 0) {
    lines.push(`\n⚠️  MISSING FIELDS (${validation.missingFields.length}):`);
    validation.missingFields.forEach(field => lines.push(`  - ${field}`));
  }

  if (validation.warnings.length > 0) {
    lines.push(`\n⚠️  WARNINGS (${validation.warnings.length}):`);
    validation.warnings.forEach(warn => lines.push(`  - ${warn}`));
  }

  lines.push(`\n=== END REPORT ===\n`);

  return lines.join('\n');
}
