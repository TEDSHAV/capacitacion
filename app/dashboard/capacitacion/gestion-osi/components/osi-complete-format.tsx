"use client";

import Image from "next/image";
import { OSIManagement } from "@/types";
import { 
  Check, 
  X,
  Calendar,
  Clock,
  User,
  MapPin,
  Building2,
  FileText,
  DollarSign
} from "lucide-react";

interface OSICompleteFormatProps {
  osi: OSIManagement;
}

export default function OSICompleteFormat({ osi }: OSICompleteFormatProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    try {
      // Handle Supabase/ISO dates more reliably
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getUTCDate().toString().padStart(2, '0');
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateString || "-";
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const sessions = Array.isArray(osi.sesiones_programadas) ? osi.sesiones_programadas : [];

  return (
    <div className="bg-white p-1 sm:p-2 text-[8px] sm:text-[9.5px] text-gray-800 font-sans border border-gray-300 shadow-sm max-w-[800px] mx-auto print:p-0 print:shadow-none print:border-none">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-gray-800 pb-0.5 mb-1">
        <div className="flex items-center gap-1.5">
          <div className="relative w-10 h-8 sm:w-14 sm:h-10">
            <Image
              src="/logo.png"
              alt="SHA Logo"
              fill
              className="object-contain"
            />
          </div>
          <div className="text-[8px] leading-tight font-bold">
            SHA<br />
            DE VENEZUELA,C.A.<br />
            J-31215131-9
          </div>
        </div>
        <div className="text-center flex-1 self-center">
          <h1 className="text-xs sm:text-sm font-black tracking-widest text-blue-900 uppercase">Orden de Servicio Interna</h1>
        </div>
        <div className="text-[7px] sm:text-[8px] text-right">
          <div className="grid grid-cols-2 gap-x-1.5 leading-none">
            <span className="font-bold">CÓDIGO:</span> <span>188</span>
            <span className="font-bold">FECHA:</span> <span>{formatDate(osi.fecha_emision)}</span>
            <span className="font-bold">REVISIÓN:</span> <span>1</span>
            <span className="font-bold">PÁGINA:</span> <span>1 de 1</span>
          </div>
        </div>
      </div>

      {/* Top Bar Info */}
      <div className="grid grid-cols-4 border-t border-l border-gray-800 text-center font-bold">
        <div className="border-r border-b border-gray-800 bg-gray-50 p-0.5 uppercase text-[7px]">Fecha de Emisión</div>
        <div className="border-r border-b border-gray-800 bg-gray-50 p-0.5 uppercase text-[7px]">N° de Presupuesto</div>
        <div className="border-r border-b border-gray-800 bg-gray-50 p-0.5 uppercase text-[7px]">N° de Orden de Compra</div>
        <div className="border-r border-b border-gray-800 bg-gray-50 p-0.5 uppercase text-[7px]">N° de OSI</div>
        <div className="border-r border-b border-gray-800 p-0.5 font-normal">{formatDate(osi.fecha_emision)}</div>
        <div className="border-r border-b border-gray-800 p-0.5 font-normal">{osi.nro_presupuesto || "-"}</div>
        <div className="border-r border-b border-gray-800 p-0.5 font-normal">-</div>
        <div className="border-r border-b border-gray-800 p-0.5 font-bold text-red-600">{osi.nro_osi}</div>
      </div>

      {/* Client Data Section */}
      <div className="mt-1">
        <div className="bg-gray-200 border-x border-t border-gray-800 text-center font-bold py-0.5 text-[7px] uppercase tracking-wider">Datos del Cliente</div>
        <div className="grid grid-cols-12 border-l border-gray-800">
          <div className="col-span-8 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center">Nombre de la Empresa</div>
          <div className="col-span-2 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center">RIF</div>
          <div className="col-span-2 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center">Código</div>
          <div className="col-span-8 border-r border-b border-gray-800 p-0.5 text-center font-medium uppercase truncate">{osi.nombre_empresa}</div>
          <div className="col-span-2 border-r border-b border-gray-800 p-0.5 text-center font-medium uppercase">{osi.cliente_rif || "-"}</div>
          <div className="col-span-2 border-r border-b border-gray-800 p-0.5 text-center font-medium">{osi.codigo_cliente || "-"}</div>
        </div>
        <div className="grid grid-cols-12 border-l border-gray-800">
          <div className="col-span-3 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold uppercase truncate">Dir. Fiscal</div>
          <div className="col-span-9 border-r border-b border-gray-800 p-0.5 uppercase leading-none truncate">{osi.direccion_fiscal || "-"}</div>
          <div className="col-span-3 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold uppercase truncate">Dir. Ejecución</div>
          <div className="col-span-9 border-r border-b border-gray-800 p-0.5 uppercase leading-none truncate">{osi.direccion_ejecucion || "-"}</div>
          <div className="col-span-3 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold uppercase truncate">Dir. Envío</div>
          <div className="col-span-9 border-r border-b border-gray-800 p-0.5 uppercase leading-none truncate">{osi.direccion_envio || "-"}</div>
        </div>
        <div className="grid grid-cols-12 border-l border-gray-800">
          <div className="col-span-6 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase">Persona Contacto</div>
          <div className="col-span-3 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase">Teléfono</div>
          <div className="col-span-3 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase">Email</div>
          <div className="col-span-6 border-r border-b border-gray-800 p-0.5 text-center uppercase truncate">{osi.persona_contacto || "-"}</div>
          <div className="col-span-3 border-r border-b border-gray-800 p-0.5 text-center truncate">{osi.contacto_telefono || "-"}</div>
          <div className="col-span-3 border-r border-b border-gray-800 p-0.5 text-center lowercase truncate">{osi.contacto_email || "-"}</div>
        </div>
      </div>

      {/* Service Detail Section */}
      <div className="mt-1">
        <div className="bg-blue-900 text-white border-x border-t border-gray-800 text-center font-bold py-0.5 text-[7px] uppercase tracking-wider">Detalle del Servicio</div>
        <div className="grid grid-cols-12 border-l border-gray-800">
          <div className="col-span-3 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase text-[7px]">Ejecutivo</div>
          <div className="col-span-3 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase text-[7px]">Tipo</div>
          <div className="col-span-6 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase text-[7px]">Servicio</div>
          <div className="col-span-3 border-r border-b border-gray-800 p-0.5 text-center font-medium uppercase truncate">{osi.ejecutivo_negocios || "-"}</div>
          <div className="col-span-3 border-r border-b border-gray-800 p-0.5 text-center font-medium uppercase truncate">{osi.tipo_servicio}</div>
          <div className="col-span-6 border-r border-b border-gray-800 p-0.5 text-center font-medium uppercase truncate">{osi.servicio}</div>
        </div>
        <div className="grid grid-cols-12 border-l border-gray-800 h-14 sm:h-16">
          <div className="col-span-2 flex flex-col h-full">
            <div className="border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase flex-none text-[7px]">Participantes</div>
            <div className="border-r border-b border-gray-800 p-0.5 flex-1 flex items-center justify-center font-bold text-[10px]">{osi.participantes_ejecucion || "-"}</div>
          </div>
          <div className="col-span-3 flex flex-col h-full">
            <div className="border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase flex-none text-[7px]">Sesiones</div>
            <div className="border-r border-b border-gray-800 p-0.5 flex-1 flex items-center justify-center font-bold text-[10px]">{osi.sesiones_ejecucion || "-"}</div>
          </div>
          <div className="col-span-2 flex flex-col h-full">
            <div className="border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase flex-none text-[7px]">Horas Totales</div>
            <div className="border-r border-b border-gray-800 p-0.5 flex-1 flex items-center justify-center font-bold text-[10px]">{osi.horas_academicas_ejecucion || "-"}</div>
          </div>
          <div className="col-span-5 flex flex-col h-full">
            <div className="border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase flex-none text-[7px]">Fecha del Servicio</div>
            <div className="flex-1 flex flex-col border-r border-gray-800 overflow-hidden">
               <div className="grid grid-cols-2 text-center border-b border-gray-800 bg-gray-50 font-bold flex-none text-[6px]">
                 <div className="border-r border-gray-800">DÍA</div>
                 <div>HORA</div>
               </div>
               <div className="flex-1 overflow-y-auto">
                 {sessions.length > 0 ? sessions.map((s: any, idx: number) => (
                   <div key={idx} className="grid grid-cols-2 text-center border-b border-gray-800 last:border-b-0">
                     <div className="border-r border-gray-800 p-0.5 text-[7px]">{formatDate(s.fecha)}</div>
                     <div className="p-0.5 text-[7px]">{s.hora || "-"}</div>
                   </div>
                 )) : (
                   <div className="grid grid-cols-2 text-center border-b border-gray-800 last:border-b-0 h-full">
                     <div className="border-r border-gray-800 p-0.5 flex items-center justify-center">-</div>
                     <div className="p-0.5 flex items-center justify-center">-</div>
                   </div>
                 )}
               </div>
            </div>
          </div>
        </div>
        <div className="border-x border-b border-gray-800 p-0.5 text-center italic bg-blue-50/30 text-[7px]">
          Para un grupo de hasta {osi.participantes_ejecucion || "X"} participantes en {osi.sesiones_ejecucion || "X"} sesiones de {osi.horas_academicas_ejecucion || "X"} horas academicas, incluye certificado y carnet en formato digital e impreso.
        </div>
      </div>

      {/* Estimated Resources Section */}
      <div className="mt-1">
        <div className="bg-blue-900 text-white border-x border-t border-gray-800 text-center font-bold py-0.5 text-[8px] uppercase tracking-wider">Recursos Estimados para el Servicio</div>
        <div className="grid grid-cols-12 border-l border-gray-800">
          <div className="col-span-3 grid grid-cols-3 border-r border-b border-gray-800 bg-gray-50 font-bold text-center text-[7px]">
            <div className="col-span-3 border-b border-gray-800 uppercase p-0.5">Honorarios Facilitador</div>
            <div className="border-r border-gray-800 p-0.5 uppercase">Horas</div>
            <div className="border-r border-gray-800 p-0.5 uppercase">Costo/H</div>
            <div className="p-0.5 uppercase">Total Hon.</div>
          </div>
          <div className="col-span-3 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase text-[7px] flex items-center justify-center">Impresión de Material</div>
          <div className="col-span-3 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase text-[7px] flex items-center justify-center">Traslado</div>
          <div className="col-span-3 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase text-[7px] flex items-center justify-center">Traslado Externo</div>
          
          <div className="col-span-3 grid grid-cols-3 border-r border-b border-gray-800 text-center h-8 sm:h-10">
            <div className="border-r border-gray-800 p-0.5 font-bold flex items-center justify-center">{osi.horas_honorarios_instructor || "-"}</div>
            <div className="border-r border-gray-800 p-0.5 flex items-center justify-center">{formatCurrency(osi.tarifa_hora_honorarios)}</div>
            <div className="p-0.5 font-bold flex items-center justify-center">{formatCurrency(osi.costo_honorarios_instructor)}</div>
          </div>
          <div className="col-span-3 border-r border-b border-gray-800 p-0.5 text-center font-bold text-[10px] flex items-center justify-center">
            {formatCurrency(osi.costo_impresion_material)}
          </div>
          <div className="col-span-3 border-r border-b border-gray-800 p-0.5 text-center font-bold text-[10px] flex items-center justify-center">
            {formatCurrency(osi.costo_traslado)}
          </div>
          <div className="col-span-3 border-r border-b border-gray-800 p-0.5 text-center font-bold text-[10px] flex items-center justify-center">
            {formatCurrency(osi.traslado_externo)}
          </div>
        </div>

        <div className="grid grid-cols-12 border-l border-gray-800">
          <div className="col-span-3 grid grid-cols-3 border-r border-b border-gray-800 bg-gray-50 font-bold text-center text-[7px]">
            <div className="col-span-3 border-b border-gray-800 uppercase p-0.5">Logística</div>
            <div className="border-r border-gray-800 p-0.5 uppercase leading-tight">Dias/Facilitador</div>
            <div className="border-r border-gray-800 p-0.5 uppercase">Costo</div>
            <div className="p-0.5 uppercase">Total Logística</div>
          </div>
          <div className="col-span-3 grid grid-cols-3 border-r border-b border-gray-800 bg-gray-50 font-bold text-center text-[7px]">
            <div className="col-span-3 border-b border-gray-800 uppercase p-0.5">Hospedaje</div>
            <div className="border-r border-gray-800 p-0.5 uppercase leading-tight">Dias/Facilitador</div>
            <div className="border-r border-gray-800 p-0.5 uppercase">Costo</div>
            <div className="p-0.5 uppercase">Total Hospedaje</div>
          </div>
          <div className="col-span-3 border-r border-b border-gray-800 bg-gray-50 p-0.5 font-bold text-center uppercase text-[7px] flex items-center justify-center">Otros</div>
          <div className="col-span-3 grid grid-cols-3 border-r border-b border-gray-800 bg-gray-50 font-bold text-center text-[7px]">
            <div className="col-span-3 border-b border-gray-800 uppercase p-0.5 text-center">Certificado / Carnet / POP</div>
            <div className="border-r border-gray-800 p-0.5 uppercase leading-tight">Certificado</div>
            <div className="border-r border-gray-800 p-0.5 uppercase">Carnet</div>
            <div className="p-0.5 uppercase">POP</div>
          </div>

          <div className="col-span-3 grid grid-cols-3 border-r border-b border-gray-800 text-center h-8 sm:h-10">
            <div className="border-r border-gray-800 p-0.5 font-bold flex items-center justify-center">{osi.dias_logistica_facilitador || "-"}</div>
            <div className="border-r border-gray-800 p-0.5 flex items-center justify-center">-</div>
            <div className="p-0.5 font-bold flex items-center justify-center">{formatCurrency(osi.costo_logistica_comida)}</div>
          </div>
          <div className="col-span-3 grid grid-cols-3 border-r border-b border-gray-800 text-center h-8 sm:h-10">
            <div className="border-r border-gray-800 p-0.5 font-bold flex items-center justify-center">{osi.dias_hospedaje_facilitador || "-"}</div>
            <div className="border-r border-gray-800 p-0.5 flex items-center justify-center">-</div>
            <div className="p-0.5 font-bold flex items-center justify-center">{formatCurrency(osi.costo_hospedaje)}</div>
          </div>
          <div className="col-span-3 border-r border-b border-gray-800 p-0.5 text-center font-bold text-[10px] flex items-center justify-center">
            {formatCurrency(osi.costo_otros)}
          </div>
          <div className="col-span-3 grid grid-cols-3 border-r border-b border-gray-800 text-center h-8 sm:h-10">
            <div className="border-r border-gray-800 p-0.5 font-bold uppercase flex items-center justify-center">{osi.certificado_impreso ? "Sí" : "No"}</div>
            <div className="border-r border-gray-800 p-0.5 font-bold uppercase flex items-center justify-center">{osi.carnet_impreso ? "Sí" : "No"}</div>
            <div className="p-0.5 font-bold uppercase flex items-center justify-center">{osi.pop_incluido ? "Sí" : "No"}</div>
          </div>
        </div>
      </div>

      {/* Pretensions & Observations Section */}
      <div className="mt-1 border border-gray-800">
        <div className="bg-blue-900 text-white text-center font-bold py-0.5 text-[8px] uppercase tracking-wider border-b border-gray-800">Pretensiones del Cliente</div>
        <div className="p-1 min-h-[30px] uppercase text-[8px] leading-relaxed border-b border-gray-800 bg-white">
          {osi.pretensiones_totales || "-"}
        </div>
        <div className="bg-blue-900 text-white text-center font-bold py-0.5 text-[8px] uppercase tracking-wider border-b border-gray-800">Observaciones Adicionales</div>
        <div className="p-1 min-h-[80px] text-[8px] leading-relaxed bg-white">
          {osi.observaciones_totales ? (
            <div className="whitespace-pre-wrap">{osi.observaciones_totales}</div>
          ) : (
            <div className="text-gray-400 italic">No hay observaciones adicionales registradas.</div>
          )}
        </div>
      </div>

      {/* Footer / Signature Sections - STATIC */}
      <div className="mt-2">
        <div className="bg-blue-900 text-white border-x border-t border-gray-800 text-center font-bold py-0.5 text-[9px] uppercase tracking-wider">Cierre del Servicio Ejecutado / Llenar por el Departamento Ejecutante</div>
        <div className="grid grid-cols-12 border-l border-gray-800">
          <div className="col-span-4 border-r border-b border-gray-800 p-4 text-center flex flex-col items-center justify-center">
            <div className="font-bold uppercase text-[8px] mb-8">Departamento Ejecutante / Nombre</div>
            <div className="border-t border-gray-400 w-full pt-1"></div>
          </div>
          <div className="col-span-5 grid grid-rows-2 h-full border-r border-gray-800">
            <div className="grid grid-cols-3 border-b border-gray-800 bg-gray-50 font-bold text-center text-[7px] uppercase h-10">
              <div className="border-r border-gray-800 p-1 flex items-center justify-center">Fecha de Recepción de OSI</div>
              <div className="border-r border-gray-800 p-1 flex items-center justify-center">Fecha de Inicio del Servicio</div>
              <div className="p-1 flex items-center justify-center">Fecha de Finalización del Servicio</div>
            </div>
            <div className="flex flex-col border-b border-gray-800">
              <div className="bg-gray-50 border-b border-gray-800 font-bold text-[7px] uppercase p-0.5 text-center">¿Su Dpto. cuenta con todos los soportes requeridos indicados en esta OSI?</div>
              <div className="text-[7px] text-center uppercase p-0.5 italic">De ser No, Justifique</div>
              <div className="flex-1"></div>
            </div>
          </div>
          <div className="col-span-3 border-r border-b border-gray-800 h-full flex flex-col">
            <div className="bg-gray-50 border-b border-gray-800 font-bold text-[7px] uppercase p-1 text-center">Responsable del Dpto.</div>
            <div className="grid grid-cols-2 flex-1 text-[7px] font-bold text-center uppercase">
              <div className="border-r border-gray-800 p-1 flex flex-col">
                <span className="mb-auto">Nombre y Apellido</span>
                <div className="border-t border-gray-300 w-full mt-2"></div>
              </div>
              <div className="p-1 flex flex-col">
                <span className="mb-auto">Firma</span>
                <div className="border-t border-gray-300 w-full mt-2"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 border-l border-gray-800">
          <div className="col-span-2 border-r border-b border-gray-800 bg-gray-50 p-1 font-bold text-center uppercase text-[8px] flex items-center justify-center">Requisiciones</div>
          <div className="col-span-1 border-r border-b border-gray-800 bg-gray-50 p-1 font-bold text-center uppercase text-[8px] flex items-center justify-center">Cantidad</div>
          <div className="col-span-4 border-r border-b border-gray-800 bg-gray-50 p-1 font-bold text-center uppercase text-[8px] flex items-center justify-center">Detalle</div>
          <div className="col-span-2 border-r border-b border-gray-800 bg-gray-50 p-1 font-bold text-center uppercase text-[8px] flex items-center justify-center">N° Solicitud(es) de Orden de Compra</div>
          <div className="col-span-1 border-r border-b border-gray-800 bg-gray-50 p-1 font-bold text-center uppercase text-[8px] flex items-center justify-center">Cantidad</div>
          <div className="col-span-2 border-r border-b border-gray-800 bg-gray-50 p-1 font-bold text-center uppercase text-[8px] flex items-center justify-center">Detalle</div>
          
          {[1, 2].map((i) => (
            <div key={i} className="col-span-12 grid grid-cols-12 border-b border-gray-800 h-4">
              <div className="col-span-2 border-r border-gray-800"></div>
              <div className="col-span-1 border-r border-gray-800"></div>
              <div className="col-span-4 border-r border-gray-800"></div>
              <div className="col-span-2 border-r border-gray-800"></div>
              <div className="col-span-1 border-r border-gray-800"></div>
              <div className="col-span-2 border-r-0 sm:border-r sm:border-gray-800"></div>
            </div>
          ))}
        </div>

        <div className="bg-gray-100 border-x border-b border-gray-800 text-center font-bold py-0.5 text-[8px] uppercase tracking-tighter">Quejas, Observaciones o Reclamos Recibidos por el Cliente</div>
        <div className="border-x border-b border-gray-800 h-8 sm:h-12 bg-white"></div>
      </div>

      {/* Signatures Table */}
      <div className="mt-2 border-l border-gray-800">
        <div className="grid grid-cols-4 border-t border-gray-800 bg-gray-50 text-[8px] font-bold text-center uppercase">
          <div className="border-r border-b border-gray-800 p-1"></div>
          <div className="border-r border-b border-gray-800 p-1">Generación de Soporte</div>
          <div className="border-r border-b border-gray-800 p-1">Validación de Soportes</div>
          <div className="border-r border-b border-gray-800 p-1">Verificación de Soportes</div>
        </div>
        <div className="grid grid-cols-4 border-b border-gray-800">
          <div className="border-r border-gray-800 bg-gray-50 p-1 font-bold text-[8px] uppercase">Nombre y Apellido:</div>
          <div className="border-r border-gray-800 p-1"></div>
          <div className="border-r border-gray-800 p-1"></div>
          <div className="border-r border-gray-800 p-1"></div>
        </div>
        <div className="grid grid-cols-4 border-b border-gray-800">
          <div className="border-r border-gray-800 bg-gray-50 p-1 font-bold text-[8px] uppercase">Cargo:</div>
          <div className="border-r border-gray-800 p-1 text-[7px] text-center font-bold">[DEPARTAMENTO SOLICITANTE]</div>
          <div className="border-r border-gray-800 grid grid-cols-2 text-[7px] text-center font-bold">
            <div className="border-r border-gray-800 p-1">[QHSE]</div>
            <div className="p-1">[NEGOCIOS]</div>
          </div>
          <div className="border-r border-gray-800 p-1 text-[7px] text-center font-bold uppercase">Director Gerente</div>
        </div>
        <div className="grid grid-cols-4 border-b border-gray-800 h-10 sm:h-12">
          <div className="border-r border-gray-800 bg-gray-50 p-1 font-bold text-[8px] uppercase">Firma:</div>
          <div className="border-r border-gray-800 p-1"></div>
          <div className="border-r border-gray-800 grid grid-cols-2 h-full">
            <div className="border-r border-gray-800 p-1"></div>
            <div className="p-1"></div>
          </div>
          <div className="border-r border-gray-800 p-1"></div>
        </div>
        <div className="grid grid-cols-4 border-b border-gray-800">
          <div className="border-r border-gray-800 bg-gray-50 p-1 font-bold text-[8px] uppercase">Fecha:</div>
          <div className="border-r border-gray-800 p-1"></div>
          <div className="border-r border-gray-800 grid grid-cols-2">
            <div className="border-r border-gray-800 p-1"></div>
            <div className="p-1"></div>
          </div>
          <div className="border-r border-gray-800 p-1"></div>
        </div>
      </div>

      {/* Certification Footer */}
      <div className="mt-4 border-t border-gray-200 pt-2">
        <div className="relative w-full h-12 sm:h-16">
          <Image
            src="/docs_footer.png"
            alt="Registrations and Certifications"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
