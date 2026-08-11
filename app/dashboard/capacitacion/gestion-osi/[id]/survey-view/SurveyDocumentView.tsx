"use client";

import React from "react";
import { CourseSatisfactionSurvey, SurveyOSIData } from "@/types";
import { Download, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

interface SurveyDocumentViewProps {
  osiData: SurveyOSIData;
  survey: CourseSatisfactionSurvey;
}

const QUESTIONS = [
  { id: 1, text: "¿Fue responsable y puntual?", section: "FACILITADOR" },
  { id: 2, text: "¿Proyectó una imagen adecuada?", section: "FACILITADOR" },
  { id: 3, text: "¿Domina el tema?", section: "FACILITADOR" },
  { id: 4, text: "¿El lenguaje utilizado fue fácil de entender?", section: "FACILITADOR" },
  { id: 5, text: "¿Estimula la participación e intercambio de ideas?", section: "FACILITADOR" },
  { id: 6, text: "¿El material didáctico utilizado fue fácil de entender?", section: "ASPECTOS DE LA CAPACITACIÓN" },
  { id: 7, text: "¿Las dinámicas, ejercicios, demostraciones y demás actividades hechas en el curso, fueron comprensibles y útiles?", section: "ASPECTOS DE LA CAPACITACIÓN" },
  { id: 8, text: "¿El contenido del curso cumplió sus expectativas?", section: "ASPECTOS DE LA CAPACITACIÓN" },
  { id: 9, text: "¿Cómo calificarías el curso?", section: "ASPECTOS DE LA CAPACITACIÓN" },
  { id: 10, text: "¿Las condiciones ambientales (aula, mobiliario, recursos didácticos si aplica) han sido adecuados?", section: "ENTORNO" },
];

export default function SurveyDocumentView({ osiData, survey }: SurveyDocumentViewProps) {
  const [mounted, setMounted] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const documentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDownload = async () => {
    if (!documentRef.current || downloading) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
        compress: true,
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      const fileName = `encuesta-osi-${osiData.nro_osi || osiData.id_osi}-${new Date()
        .toISOString()
        .split("T")[0]}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("Error generating survey PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 print:bg-white print:p-0">
      {/* Admin Controls - Hidden in print */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link
          href={`/dashboard/capacitacion/gestion-osi`}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Gestión OSI
        </Link>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {downloading ? "Generando PDF..." : "Descargar PDF"}
        </button>
      </div>

      {/* Document Content */}
      <div
        ref={documentRef}
        className="max-w-[850px] mx-auto bg-white shadow-2xl p-8 border border-gray-200 print:shadow-none print:border-none print:p-0 min-h-[1050px] flex flex-col"
      >
        {/* Header Grid Matrix */}
        <div className="grid grid-cols-[1fr_2fr_1fr] border-2 border-black mb-4">
          <div className="border-r-2 border-black p-2 flex flex-col items-center justify-center">
            <Image src="/logo.png" alt="SHA Logo" width={100} height={35} className="mb-1" />
            <p className="text-[10px] font-bold text-center leading-tight">SHA DE VENEZUELA, C.A.</p>
            <p className="text-[9px] text-center">J-31315131-9</p>
          </div>
          <div className="border-r-2 border-black p-2 flex items-center justify-center">
            <h1 className="text-sm font-black text-center">ENCUESTA DE SATISFACCIÓN DEL PARTICIPANTE</h1>
          </div>
          <div className="flex flex-col text-[8px] font-bold">
            <div className="border-b-2 border-black p-1 flex justify-between">
              <span>CÓDIGO:</span>
              <span className="font-normal">SHA-RG-CAP-003</span>
            </div>
            <div className="border-b-2 border-black p-1 flex justify-between">
              <span>FECHA:</span>
              <span className="font-normal">01/04/2026</span>
            </div>
            <div className="border-b-2 border-black p-1 flex justify-between">
              <span>REVISIÓN:</span>
              <span className="font-normal">00</span>
            </div>
            <div className="p-1 flex justify-between">
              <span>PÁGINA:</span>
              <span className="font-normal">1 de 1</span>
            </div>
          </div>
        </div>

        {/* INFORMACIÓN GENERAL Section */}
        <div className="border-2 border-black mb-4">
          <div className="bg-gray-100 border-b-2 border-black p-1">
            <h2 className="text-[10px] font-black text-center">INFORMACIÓN GENERAL DEL CURSO</h2>
          </div>
          <div className="p-2 space-y-1 text-[10px]">
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <span className="font-bold">Nombre de la empresa:</span>
              <span className="border-b border-gray-400 pb-px">{osiData.nombre_empresa}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <span className="font-bold">Nombre del curso:</span>
              <span className="border-b border-gray-400 pb-px">{osiData.servicio}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <span className="font-bold">Nombre del facilitador:</span>
              <span className="border-b border-gray-400 pb-px">{osiData.facilitador_nombre || "______________________________________________________"}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <span className="font-bold">Fecha del curso:</span>
              <span className="border-b border-gray-400 pb-px">
                {mounted && osiData.fecha_inicio_real
                  ? formatDate(osiData.fecha_inicio_real)
                  : "______________________________________________________"}
              </span>
            </div>
            {osiData.nro_sesion && osiData.nro_sesion > 1 && (
              <div className="grid grid-cols-[140px_1fr] gap-2">
                <span className="font-bold">Sesión:</span>
                <span className="border-b border-gray-400 pb-px">Sesión {osiData.nro_sesion}</span>
              </div>
            )}
          </div>
        </div>

        {/* Evaluation Scale Info */}
        <div className="text-center mb-4">
          <p className="text-[9px] font-bold italic mb-1 uppercase underline">Valore y marque el círculo que considere, donde:</p>
          <div className="flex justify-center items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((v) => (
               <div key={v} className="flex flex-col items-center">
                 <div className="w-5 h-5 rounded-full border border-black flex items-center justify-center text-[8px] font-bold">
                   {v}
                 </div>
               </div>
            ))}
          </div>
          <p className="text-[9px] font-bold">
            1 = MALO / 2 = POCO ACEPTABLE / 3 = BUENO / 4 = MUY BUENO / 5 = EXCELENTE
          </p>
        </div>

        {/* Evaluation Questions Matrix */}
        <div className="flex-grow">
          {["FACILITADOR", "ASPECTOS DE LA CAPACITACIÓN", "ENTORNO"].map((section) => (
            <div key={section} className="mb-2">
              <div className="bg-gray-100 border-x-2 border-y-2 border-black p-1">
                <h3 className="text-[9px] font-black text-center">{section}</h3>
              </div>
              <div className="border-x-2 border-b-2 border-black">
                {QUESTIONS.filter((q) => q.section === section).map((q, idx, arr) => (
                  <div 
                    key={q.id} 
                    className={`grid grid-cols-[1fr_120px] items-center p-1.5 ${idx < arr.length - 1 ? "border-b border-gray-300" : ""}`}
                  >
                    <p className="text-[9px] leading-tight pr-4">
                      <span className="font-bold mr-1">{q.id}.</span> {q.text}
                    </p>
                    <div className="flex justify-between px-2">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <div 
                          key={v} 
                          className={`
                            w-5 h-5 rounded-full border border-black flex items-center justify-center text-[8px] font-bold
                            ${survey[`q${q.id}` as keyof CourseSatisfactionSurvey] === v ? "bg-black text-white" : ""}
                          `}
                        >
                          {v}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Attendance Reason Section */}
        <div className="mt-4 border-2 border-black p-2">
           <p className="text-[9px] font-bold mb-2 italic underline">¿Por qué asististe al curso? Marque con una X</p>
           <div className="flex justify-around">
             {[
               { id: "Requerimiento de la empresa", label: "Requerimiento de la empresa" },
               { id: "Crecimiento laboral", label: "Crecimiento laboral" },
               { id: "Desarrollo personal", label: "Desarrollo personal" }
             ].map((opt) => (
               <div key={opt.id} className="flex items-center gap-2">
                 <div className="w-5 h-5 border-2 border-black flex items-center justify-center text-xs font-black">
                   {survey.attendance_reasons.includes(opt.id) ? "X" : ""}
                 </div>
                 <span className="text-[9px]">{opt.label}</span>
               </div>
             ))}
           </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-12 pb-6 flex flex-col items-center">
          <div className="w-full h-[3px] bg-gradient-to-r from-blue-600 via-red-600 to-green-600 mb-3"></div>
          <Image src="/docs_footer.png" alt="Footer Icons" width={786} height={30} className="w-full h-auto mb-3" />
          <div className="flex justify-between w-full text-[8px] font-bold text-gray-500 uppercase px-4">
            <span>REGISTRADOS: [SNC] [INCES] [MINPPTRASS] [FONACIT]</span>
            <span>CERTIFICADOS: [ISO 9001]</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
          }
          @page {
            margin: 0.5cm;
          }
        }
      `}</style>
    </div>
  );
}
