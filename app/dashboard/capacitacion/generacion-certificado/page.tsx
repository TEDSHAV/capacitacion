"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  OSI,
  CourseTopic,
  CertificateGeneration,
  CertificateParticipant,
} from "@/types";
import OSISearch from "./components/osi-search";
import { CertificateForm } from './components/certificate-form';
import { getCertificateData } from '@/app/actions/certificate';

export default function GeneracionCertificadoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [osis, setOsis] = useState<OSI[]>([]);
  const [courseTopics, setCourseTopics] = useState<CourseTopic[]>([]);
  const [selectedOSI, setSelectedOSI] = useState<OSI | null>(null);
  const [selectedCourseTopic, setSelectedCourseTopic] =
    useState<CourseTopic | null>(null);
  const [certificateData, setCertificateData] = useState<CertificateGeneration>(
    {
      osi_id: "",
      certificate_title: "",
      certificate_subtitle: "",
      passing_grade: 14,
      course_topic_id: "",
      course_content: "",
      participants: [],
      location: "",
      date: new Date().toISOString().split("T")[0],
    },
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await getCertificateData();

        if (result.error) {
          router.push("/login");
          return;
        }

        setOsis(result.osis || []);
        setCourseTopics(result.courseTopics || []);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleOSISelect = (osi: OSI | null) => {
    setSelectedOSI(osi);

    if (osi) {
      setCertificateData((prev) => ({
        ...prev,
        osi_id: osi.nro_osi,
        osi_data: osi,
      }));

      // Auto-populate course topic based on OSI data
      const matchingTopic = findMatchingCourseTopic(osi);
      if (matchingTopic) {
        setSelectedCourseTopic(matchingTopic);
        setCertificateData((prev) => ({
          ...prev,
          course_topic_id: matchingTopic.id,
          course_topic_data: matchingTopic,
          course_content: matchingTopic.contenido_curso || "", // Use course content from database
        }));
      } else {
        setSelectedCourseTopic(null);
        setCertificateData((prev) => ({
          ...prev,
          course_topic_id: "",
          course_topic_data: undefined,
          course_content: "",
        }));
      }
    } else {
      // Clear all related data when OSI is cleared
      setCertificateData((prev) => ({
        ...prev,
        osi_id: "",
        osi_data: undefined,
        course_topic_id: "",
        course_topic_data: undefined,
        course_content: "",
      }));
      setSelectedCourseTopic(null);
    }
  };

  const findMatchingCourseTopic = (osi: OSI): CourseTopic | null => {
    if (!osi.tema && !osi.detalle_capacitacion && !osi.detalle_sesion) {
      return null;
    }

    // Try to find exact match with tema
    let match = courseTopics.find(
      (topic) =>
        osi.tema && topic.name.toLowerCase().includes(osi.tema!.toLowerCase()),
    );

    // If no exact match, try with detalle_capacitacion
    if (!match && osi.detalle_capacitacion) {
      match = courseTopics.find(
        (topic) =>
          topic.name
            .toLowerCase()
            .includes(osi.detalle_capacitacion!.toLowerCase()) ||
          (topic.description &&
            topic.description
              .toLowerCase()
              .includes(osi.detalle_capacitacion!.toLowerCase())),
      );
    }

    // If still no match, try with detalle_sesion
    if (!match && osi.detalle_sesion) {
      match = courseTopics.find(
        (topic) =>
          topic.name
            .toLowerCase()
            .includes(osi.detalle_sesion!.toLowerCase()) ||
          (topic.description &&
            topic.description
              .toLowerCase()
              .includes(osi.detalle_sesion!.toLowerCase())),
      );
    }

    return match || null;
  };

  const handleCertificateDataChange = (
    field: keyof CertificateGeneration,
    value: any,
  ) => {
    setCertificateData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleParticipantsChange = (participants: CertificateParticipant[]) => {
    setCertificateData((prev) => ({
      ...prev,
      participants,
    }));
  };

  const handleGenerateCertificate = async () => {
    // Validate required fields
    if (
      !certificateData.osi_id ||
      !certificateData.certificate_title ||
      !certificateData.course_topic_id ||
      certificateData.participants.length === 0
    ) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    try {
      // Here you would typically save to database and/or generate PDF
      alert("Certificado generado exitosamente!");

      // Reset form
      setSelectedOSI(null);
      setSelectedCourseTopic(null);
      setCertificateData({
        osi_id: "",
        certificate_title: "",
        certificate_subtitle: "",
        passing_grade: 14,
        course_topic_id: "",
        participants: [],
        location: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      alert("Error al generar el certificado");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
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
          Crea certificados personalizados para los participantes de
          capacitaciones
        </p>
      </div>

      <div className="space-y-6">
        {/* OSI Search - First step in workflow */}
        <OSISearch
          osis={osis}
          selectedOSI={selectedOSI}
          onSelect={handleOSISelect}
        />

        {/* Certificate Form */}
        <CertificateForm
          certificateData={certificateData}
          selectedOSI={selectedOSI}
          selectedCourseTopic={selectedCourseTopic}
          onDataChange={handleCertificateDataChange}
          onParticipantsChange={handleParticipantsChange}
          onGenerate={handleGenerateCertificate}
        />
      </div>
    </div>
  );
}
