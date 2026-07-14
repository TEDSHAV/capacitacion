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
  });

  // Use initial data from server component
  const osis = initialData.osis || [];
  const courses = initialData.courses || [];
  const error = initialData.error;

  // Load carnet templates
  useEffect(() => {
    const loadCarnetTemplates = async () => {
      try {
        const result = await getCarnetTemplatesAction();
        if (result.data) {
          setCarnetTemplates(result.data);
        }
      } catch (error) {
        console.error('Error loading carnet templates:', error);
      }
    };
    
    loadCarnetTemplates();
  }, []);

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

      // Find exact course by id_curso if available
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
      
      const certificates = [];
      for (let i = 0; i < certificateData.participants.length; i++) {
        const participant = certificateData.participants[i];
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
          certificates.push({ participant, blob });
        } catch (error) {
          console.error('Error generating certificate for participant:', participant, error);
        }
      }

      // Download certificates
      certificates.forEach(({ participant, blob }) => {
        const filename = `certificado_${participant.name.replace(/\s+/g, '_')}_${participant.id_number}.pdf`;
        certificateGenerator.downloadBlob(blob, filename);
      });

      // Generate carnets if course requires them
      let carnetsGenerated = 0;
      if (selectedCourseTopic?.emite_carnet) {
        console.log('🎯 Starting carnet generation for course:', selectedCourseTopic.name);
        console.log('📋 Certificate IDs:', dbResult.certificateIds);
        console.log('👥 Participant IDs:', dbResult.participantIds || 'Not available');
        console.log('👥 Participants:', certificateData.participants);
        
        try {
          const { CarnetGenerator } = await import('@/lib/carnet-generator');
          const carnetGenerator = new CarnetGenerator();
          
          // Prepare carnet data for all participants
          const carnetData: CarnetGeneration[] = certificateData.participants.map((participant, index) => {
            console.log(`🔧 Preparing carnet ${index + 1} for participant:`, participant.name);
            console.log(`📋 Using database participant ID: ${dbResult.participantIds?.[index]}`);
            return {
              id_certificado: dbResult.certificateIds![index],
              id_participante: dbResult.participantIds?.[index] || 0, // Use REAL database ID
              id_empresa: selectedOSI?.empresa_id || null,
              id_curso: parseInt(certificateData.course_topic_id),
              id_osi: parseInt(certificateData.osi_id),
              titulo_curso: certificateData.certificate_title,
              fecha_emision: certificateData.date,
              fecha_vencimiento: certificateData.fecha_vencimiento || null,
              nombre_participante: participant.name,
              cedula_participante: participant.id_number,
              empresa_participante: participant.company || null
            };
          });

          console.log('💾 Carnet data prepared:', carnetData);

          // Save carnets to database
          console.log('💾 Saving carnets to database...');
          const carnetDbResult = await (await import('@/app/actions/carnets')).saveCarnetsToDatabase(
            carnetData,
            dbResult.certificateIds!
          );

          console.log('📊 Database result:', carnetDbResult);

          if (carnetDbResult.success && carnetDbResult.carnetIds) {
            console.log('✅ Carnets saved to database with IDs:', carnetDbResult.carnetIds);
            
            // Generate carnet PDFs
            const carnetRequests = carnetData.map((carnet, index) => {
              // Get template image based on selected carnet template
              let templateImage = '/templates/carnet.png'; // fallback
              if (certificateData.id_plantilla_carnet) {
                const selectedTemplate = carnetTemplates.find((template: any) => template.id === certificateData.id_plantilla_carnet);
                if (selectedTemplate?.archivo) {
                  // Use the template file, but fallback to carnet.png if file doesn't exist
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

            console.log('🔄 Generating carnet PDFs...');
            const carnetBlobs = await carnetGenerator.generateMultipleCarnets(carnetRequests);
            console.log('📄 Generated carnet blobs:', carnetBlobs.length);
            
            // Download carnets
            carnetBlobs.forEach((blob, index) => {
              const participant = certificateData.participants[index];
              const filename = `carnet_${participant.name.replace(/\s+/g, '_')}_${participant.id_number}.pdf`;
              console.log(`⬇️ Downloading carnet: ${filename}`);
              carnetGenerator.downloadBlob(blob, filename);
            });

            carnetsGenerated = carnetBlobs.length;
            console.log(`🎉 Successfully generated ${carnetsGenerated} carnets`);
          } else {
            console.error('❌ Failed to save carnets to database:', carnetDbResult.message);
            alert(`Error guardando carnets en base de datos: ${carnetDbResult.message}`);
          }
        } catch (error) {
          console.error('💥 Error generating carnets:', error);
          alert('Error generando carnets. Los certificados se generaron correctamente. Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      } else {
        console.log('ℹ️ Course does not emit carnets, skipping carnet generation');
      }

      const successMessage = `Se generaron y guardaron ${certificates.length} certificados${carnetsGenerated > 0 ? ` y ${carnetsGenerated} carnets` : ''} exitosamente!`;
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
      });
      setSelectedOSI(null);
      setSelectedCourseTopic(null);

    } catch (error) {
      console.error('Error generating certificates:', error);
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
                <p>{error}</p>
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
