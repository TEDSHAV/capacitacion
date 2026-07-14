// Test script to verify single-page certificate generation
import { CertificateGenerator } from './lib/certificate-generator.js';

// Mock data for testing
const mockParticipant = {
  id: '1',
  name: 'Test Participant',
  id_number: 'V-12345678',
  nacionalidad: 'venezolano',
  score: 18
};

const mockCertificateData = {
  id: '1',
  certificate_title: 'Test Certificate',
  certificate_subtitle: 'Test Subtitle',
  date: '2024-01-01',
  location: 'Test Location',
  horas_estimadas: 40,
  passing_grade: 14,
  osi_id: '123',
  osi_data: {
    nro_osi: 123,
    empresa_id: 1,
    tema: 'Test Course',
    detalle_capacitacion: 'Test Content',
    direccion_fiscal: 'Test Address'
  },
  course_topic_id: '1',
  course_topic_data: {
    id: 1,
    nombre: 'Test Course',
    contenido: 'This is test course content that will be displayed in the certificate.',
    horas_estimadas: 40,
    nota_aprobatoria: 14
  },
  course_content: 'This is test course content that will be displayed in the certificate.',
  participants: [mockParticipant],
  facilitator_id: '1',
  facilitator_data: null,
  sha_signature_id: null,
  sha_signature_data: null
};

const mockControlNumbers = {
  nro_libro: 1,
  nro_hoja: 1,
  nro_linea: 1,
  nro_control: 1
};

async function testSinglePageCertificate() {
  console.log('Testing single-page certificate generation...');
  
  try {
    const generator = new CertificateGenerator();
    
    // Test single-page mode
    const singlePageBlob = await generator.generateCertificate({
      participant: mockParticipant,
      certificateData: mockCertificateData,
      templateImage: '/templates/certificado.png',
      sealImage: '/templates/sello.png',
      controlNumbers: mockControlNumbers,
      isPreview: false,
      certificateId: 1,
      singlePage: true
    });
    
    console.log('Single-page certificate generated successfully!');
    console.log('Blob size:', singlePageBlob.size, 'bytes');
    
    // Test two-page mode for comparison
    const twoPageBlob = await generator.generateCertificate({
      participant: mockParticipant,
      certificateData: mockCertificateData,
      templateImage: '/templates/certificado.png',
      sealImage: '/templates/sello.png',
      controlNumbers: mockControlNumbers,
      isPreview: false,
      certificateId: 2,
      singlePage: false
    });
    
    console.log('Two-page certificate generated successfully!');
    console.log('Blob size:', twoPageBlob.size, 'bytes');
    
    // Compare sizes (single-page should be smaller)
    console.log('Size comparison:');
    console.log('Single-page:', singlePageBlob.size, 'bytes');
    console.log('Two-page:', twoPageBlob.size, 'bytes');
    console.log('Difference:', twoPageBlob.size - singlePageBlob.size, 'bytes');
    
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run the test
testSinglePageCertificate().then(success => {
  console.log('Test result:', success ? 'SUCCESS' : 'FAILED');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
