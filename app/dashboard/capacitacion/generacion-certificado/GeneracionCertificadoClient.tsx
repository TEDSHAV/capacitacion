"use client";

import { useState, useEffect } from "react";
import {
  CourseTopic,
  CertificateGeneration,
  CertificateParticipant,
  CertificateOSI,
  CarnetGeneration,
} from "@/types";
import OSISearch from "./components/osi-search";
import { CertificateForm } from './components/certificate-form';
import { CarnetDebug } from '@/components/carnets/carnet-debug';
import { saveCertificatesToDatabase } from '@/app/actions/certificados';
import { getCarnetTemplatesAction } from '@/app/actions/dropdown-data';
import { QRService } from '@/lib/qr-service';
import { generateDocumentsServer } from '@/lib/document-server-actions';
import { getDocumentFileName, getDefaultFirmante } from '@/lib/document-client-utils';

interface GeneracionCertificadoClientProps {
  user: any;
  initialData: any;
}

export default function GeneracionCertificadoClient({
  user,
  initialData
}: GeneracionCertificadoClientProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedOSI, setSelectedOSI] = useState<CertificateOSI | null>(null);
  const [selectedCourseTopic, setSelectedCourseTopic] = useState<CourseTopic | null>(null);
  const [courseTopics, setCourseTopics] = useState<CourseTopic[]>([]);
  const [carnetTemplates, setCarnetTemplates] = useState<any[]>([]);
  const [certificateData, setCertificateData] = useState<CertificateGeneration>({
    osi_id: "",
    certificate_title: "",
    certificate_subtitle: "",
    passing_grade: 14,
    course_topic_id: "",
    course_topic_data: undefined,
    course_template_id: undefined,
    course_content: "",
    participants: [],
    location: "",
    date: new Date().toISOString().split("T")[0],
    horas_estimadas: undefined,
    facilitator_id: undefined,
    facilitator_data: undefined,
    sha_signature_id: undefined,
    fecha_vencimiento: undefined,
    id_estado: undefined,
    id_plantilla_certificado: undefined,
    generate_documents: true, // Default to true for convenience
  });

  // Use initial data from server component
  const osis = initialData.osis || [];
  const courses = initialData.courses || [];
  
  // Comprehensive error handling to ensure we always have a string or null
  const error = (() => {
    if (!initialData.error) return null;
    
    // If it's already a string, return it
    if (typeof initialData.error === 'string') return initialData.error;
    
    // If it's an object with a message property, return the message
    if (initialData.error && typeof initialData.error === 'object' && 'message' in initialData.error) {
      return initialData.error.message;
    }
    
    // If it's an object with an error property, return that
    if (initialData.error && typeof initialData.error === 'object' && 'error' in initialData.error) {
      return typeof initialData.error.error === 'string' ? initialData.error.error : 'Error occurred';
    }
    
    // Fallback: convert to string if possible, otherwise return generic error
    try {
      return String(initialData.error);
    } catch {
      return 'Error loading data';
    }
  })();

  // Load carnet templates
  useEffect(() => {
    const loadCarnetTemplates = async () => {
      try {
        const result = await getCarnetTemplatesAction();
        if (result.data) {
          setCarnetTemplates(result.data);
        }
      } catch (error) {
        // Continue without templates
      }
    };
    
    loadCarnetTemplates();
  }, []);

  // Effect to set default course content when course topic changes (but no template selected)
  useEffect(() => {
    if (selectedCourseTopic && !certificateData.course_template_id) {
      // Use course's default content if available
      if (selectedCourseTopic.contenido_curso) {
        handleCertificateDataChange("course_content", selectedCourseTopic.contenido_curso);
      }
    }
  }, [selectedCourseTopic?.id, selectedCourseTopic?.contenido_curso, certificateData.course_template_id]);

  const handleOSISelect = (osi: CertificateOSI | null) => {
    setSelectedOSI(osi);

    if (osi) {
      setCertificateData((prev) => ({
        ...prev,
        osi_id: osi.id,
        osi_data: osi,
        course_topic_id: "",
        course_topic_data: undefined,
        course_content: "",
      }));
      setSelectedCourseTopic(null);

      // id_curso is id_servicio from v_osi_formato_completo — direct match against catalogo_servicios.id
      let selectedCourse: CourseTopic | null = null;

      if (osi.id_curso) {
        selectedCourse = courses.find(
          (topic: CourseTopic) => topic.id === osi.id_curso!.toString()
        ) || null;
      }

      // Auto-select the course if found
      if (selectedCourse) {
        const passingGrade = selectedCourse.nota_aprobatoria ?? 14;
        
        setCertificateData((prev) => ({
          ...prev,
          course_topic_id: selectedCourse.id,
          course_topic_data: selectedCourse,
          course_content: selectedCourse.contenido_curso || '',
          passing_grade: passingGrade,
          horas_estimadas: selectedCourse.horas_estimadas,
          certificate_title: selectedCourse.name,
          id_plantilla_certificado: selectedCourse.id_plantilla_certificado || prev.id_plantilla_certificado,
        }));
        setSelectedCourseTopic(selectedCourse);
      }
    } else {
      setCertificateData((prev) => ({
        ...prev,
        osi_id: "",
        osi_data: undefined,
        course_topic_id: "",
        course_topic_data: undefined,
        course_content: "",
        passing_grade: 14,
      }));
      setSelectedCourseTopic(null);
    }
  };

  const handleCertificateDataChange = (
    field: keyof CertificateGeneration,
    value: any,
  ) => {
    if (field === 'course_topic_id') {
      const selectedTopic = courses.find((topic: CourseTopic) => topic.id === value);
      
      if (selectedTopic) {
        const passingGrade = selectedTopic.nota_aprobatoria ?? 14;
        
        setCertificateData((prev) => ({
          ...prev,
          [field]: value,
          course_topic_data: selectedTopic,
          course_content: selectedTopic.contenido_curso || '',
          passing_grade: passingGrade,
          horas_estimadas: selectedTopic.horas_estimadas,
          certificate_title: prev.certificate_title || selectedTopic.name,
          id_plantilla_certificado: selectedTopic.id_plantilla_certificado || prev.id_plantilla_certificado,
          fecha_vencimiento: selectedTopic.emite_carnet ? prev.fecha_vencimiento : undefined,
        }));
        setSelectedCourseTopic(selectedTopic);
      } else {
        setCertificateData((prev) => ({
          ...prev,
          [field]: value,
          course_content: '',
          passing_grade: 14,
          fecha_vencimiento: undefined,
        }));
        setSelectedCourseTopic(null);
      }
    } else {
      setCertificateData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleParticipantsChange = (participants: CertificateParticipant[]) => {
    setCertificateData((prev) => ({
      ...prev,
      participants,
    }));
  };

  const handleGenerateCertificate = async () => {
    if (
      !certificateData.osi_id ||
      !certificateData.certificate_title ||
      !certificateData.course_topic_id ||
      certificateData.participants.length === 0
    ) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    if (selectedCourseTopic?.emite_carnet && !certificateData.fecha_vencimiento) {
      alert("Este curso emite carnet, por lo que la fecha de vencimiento es requerida");
      return;
    }

    // Validate content length
    if ((certificateData.course_content?.length || 0) > 2000) {
      alert('El contenido del curso excede el límite de 2000 caracteres. Por favor, reduce el contenido.');
      return;
    }

    try {
      setIsGenerating(true);

      const dbResult = await saveCertificatesToDatabase(
        certificateData,
        certificateData.participants
      );

      if (!dbResult.success) {
        alert(`Error guardando certificados en base de datos: ${dbResult.message}`);
        return;
      }

      if (!dbResult.certificateNumbers || dbResult.certificateNumbers.length === 0) {
        alert("Error: No se pudieron obtener los números de control de la base de datos");
        return;
      }

      // Use existing certificate generation
      const { CertificateGenerator } = await import('@/lib/certificate-generator');
      const certificateGenerator = new CertificateGenerator();

      const templateImageUrl = '/templates/certificado.png';
      const sealImageUrl = '/templates/sello.png';
      
      // Generate all certificates in parallel for better performance
      const certificatePromises = certificateData.participants.map(async (participant, i) => {
        const controlNumbers = dbResult.certificateNumbers![i];
        try {
          const blob = await certificateGenerator.generateCertificate({
            participant,
            certificateData,
            templateImage: templateImageUrl,
            sealImage: sealImageUrl,
            controlNumbers,
            isPreview: false,
            certificateId: dbResult.certificateIds![i]
          });
          return { participant, blob, success: true };
        } catch (error) {
          return { participant, blob: null, success: false };
        }
      });

      const certificateResults = await Promise.allSettled(certificatePromises);
      const certificates = certificateResults
        .filter((r): r is PromiseFulfilledResult<{participant: any, blob: Blob, success: true}> => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value);

      // Download certificates with staggered delay to prevent browser throttling
      const certificateItems = certificates.map(({ participant, blob }) => ({
        blob,
        filename: `certificado_${participant.name.replace(/\s+/g, '_')}_${participant.id_number}.pdf`
      }));
      await certificateGenerator.downloadMultipleBlobs(certificateItems, 50);

      // Generate carnets if course requires them
      let carnetsGenerated = 0;
      if (selectedCourseTopic?.emite_carnet) {
        try {
          const { CarnetGenerator } = await import('@/lib/carnet-generator');
          const carnetGenerator = new CarnetGenerator();
          
          // Prepare carnet data for all participants
          const carnetData: CarnetGeneration[] = certificateData.participants.map((participant, index) => {
            return {
              id_certificado: dbResult.certificateIds![index],
              id_participante: dbResult.participantIds?.[index] || 0, // Use REAL database ID
              id_empresa: selectedOSI?.empresa_id || null,
              id_curso: certificateData.course_topic_data?.cursos_id ?? null, // FK → cursos; cursos_id holds the real cursos.id
              id_osi: null, // nro_osi is the reference; stored in snapshot_contenido. carnets.id_osi FK → osi not applicable here.
              titulo_curso: certificateData.certificate_title,
              fecha_emision: certificateData.date,
              fecha_vencimiento: certificateData.fecha_vencimiento || null,
              nombre_participante: participant.name,
              cedula_participante: participant.id_number,
              empresa_participante: participant.company || null,
              nro_control: dbResult.certificateNumbers![index].nro_control
            };
          });

          const carnetDbResult = await (await import('@/app/actions/carnets')).saveCarnetsToDatabase(
            carnetData,
            dbResult.certificateIds!
          );

          if (carnetDbResult.success && carnetDbResult.carnetIds) {
            
            // Generate carnet PDFs
            const carnetRequests = carnetData.map((carnet, index) => {
              // Get template image based on selected carnet template
              const defaultTemplate = '/templates/carnet.png';
              let templateImage = defaultTemplate;
              
              if (certificateData.id_plantilla_carnet) {
                const selectedTemplate = carnetTemplates.find((template: any) => template.id === certificateData.id_plantilla_carnet);
                if (selectedTemplate?.archivo && selectedTemplate.archivo !== 'carnet.png') {
                  // Try to use custom template, carnet generator will fallback if it doesn't exist
                  templateImage = `/templates/${selectedTemplate.archivo}`;
                }
              }
              
              return {
                participant: certificateData.participants[index],
                carnetData: carnet,
                templateImage,
                isPreview: false,
                carnetId: carnetDbResult.carnetIds![index]
              };
            });

            // Generate carnet PDFs
            const carnetRequestsWithQR = await Promise.all(
              carnetRequests.map(async (carnetReq, index) => {
                // Generate QR code for carnet using the certificate ID
                let qrDataURL: string | undefined;
                try {
                  const certificateId = dbResult.certificateIds![index];
                  const qrData = QRService.generateQRData(certificateId);
                  qrDataURL = await QRService.generateQRDataURL({
                    data: qrData,
                    size: 60,
                    level: 'M',
                    includeMargin: true
                  });
                } catch (qrError) {
                  // Continue without QR code - carnet generator will use placeholder
                }

                return {
                  ...carnetReq,
                  qrDataURL
                };
              })
            );

            const carnetBlobs = await carnetGenerator.generateMultipleCarnets(carnetRequestsWithQR);
            
            // Download carnets with staggered delay to prevent browser throttling
            const carnetItems = carnetBlobs.map((blob, index) => ({
              blob,
              filename: `carnet_${certificateData.participants[index].name.replace(/\s+/g, '_')}_${certificateData.participants[index].id_number}.pdf`
            }));
            await carnetGenerator.downloadMultipleBlobs(carnetItems, 50);

            carnetsGenerated = carnetBlobs.length;
          } else {
            alert(`Error guardando carnets en base de datos: ${carnetDbResult.message}`);
          }
        } catch (error) {
          alert('Error generando carnets. Los certificados se generaron correctamente. Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      }

      // Generate and download additional documents
      let documentsGenerated = 0;
      if (certificateData.generate_documents) {
        try {
          
          // Prepare certificate data for document generation
          const certificateRecords = certificates.map(({ participant }, index) => ({
            participant_name: participant.name,
            participant_id_number: participant.id_number,
            participant_id_type: participant.id_type, // V- or E- prefix info
            participant_nationality: participant.nationality, // venezolano or extranjero
            course_title: certificateData.certificate_title,
            company_name: selectedOSI?.cliente_nombre_empresa || '',
            osi_number: selectedOSI?.nro_osi || '',
            city: certificateData.location || 'Puerto La Cruz',
            location: certificateData.location || '',
            execution_address: selectedOSI?.direccion_ejecucion || '',
            execution_date: selectedOSI?.fecha_ejecucion1 || certificateData.date,
            score: participant.score || 14,
            control_number: dbResult.certificateNumbers![index]?.nro_control?.toString() || '', // Use actual control numbers from database
          }));

          // Call server action for document generation
          const result = await generateDocumentsServer({
            certificates: certificateRecords,
            osiData: selectedOSI || {},
            firmanteData: {
              nombre: 'DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.',
              cargo: 'Jefe de Capacitación'
            },
            options: {
              includeCertificacionCompetencias: true,
              includeNotaEntrega: true,
              includeValidacionDatos: true,
            }
          });

          if (result.success && result.documents) {
            // Download all generated documents with staggered delay
            const documentEntries = Object.entries(result.documents);
            for (let i = 0; i < documentEntries.length; i++) {
              const [docType, base64String] = documentEntries[i];
              const filename = getDocumentFileName(docType, selectedOSI?.nro_osi);
              
              // Convert Base64 string back to Buffer
              const binaryString = atob(base64String);
              const bytes = new Uint8Array(binaryString.length);
              for (let j = 0; j < binaryString.length; j++) {
                bytes[j] = binaryString.charCodeAt(j);
              }
              const buffer = Buffer.from(bytes);
              
              const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              });
              
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              
              // Reduced delay to 50ms for faster feel
              if (i < documentEntries.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            }

            documentsGenerated = Object.keys(result.documents).length;
          } else {
          }
          
        } catch (error) {
          // Don't show alert for document errors since certificates/carnets were generated successfully
        }
      }

      const documentText = documentsGenerated > 0 ? ` y ${documentsGenerated} documentos adicionales` : '';
      const successMessage = `Se generaron y guardaron ${certificates.length} certificados${carnetsGenerated > 0 ? ` y ${carnetsGenerated} carnets` : ''}${documentText} exitosamente!`;
      alert(successMessage);

      // Reset form
      setCertificateData({
        osi_id: "",
        certificate_title: "",
        certificate_subtitle: "",
        passing_grade: 14,
        course_topic_id: "",
        course_content: "",
        course_template_id: undefined,
        participants: [],
        location: "",
        date: new Date().toISOString().split("T")[0],
        horas_estimadas: undefined,
        facilitator_id: undefined,
        facilitator_data: undefined,
        sha_signature_id: undefined,
        fecha_vencimiento: undefined,
        id_estado: undefined,
        id_plantilla_certificado: undefined,
        generate_documents: true, // Reset to default
      });
      setSelectedOSI(null);
      setSelectedCourseTopic(null);

    } catch (error) {
      alert('Error generando certificados. Por favor intente nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error al cargar los datos
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || 'Error desconocido'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Generación de Certificados
        </h1>
        <p className="mt-2 text-gray-600">
          Crea certificados personalizados para los participantes de capacitaciones
        </p>
      </div>

      <div className="space-y-6">
        {/* <CarnetDebug 
          selectedCourseTopic={selectedCourseTopic} 
          certificateData={certificateData} 
        /> */}
        
        <OSISearch
          osis={osis}
          selectedOSI={selectedOSI}
          onSelect={handleOSISelect}
          matchedCourse={selectedCourseTopic}
          allCourses={courses}
        />

        <CertificateForm
          certificateData={certificateData}
          selectedOSI={selectedOSI}
          selectedCourseTopic={selectedCourseTopic}
          courseTopics={courses}
          isGenerating={isGenerating}
          onDataChange={handleCertificateDataChange}
          onParticipantsChange={handleParticipantsChange}
          onGenerate={handleGenerateCertificate}
        />
      </div>
    </div>
  );
}
