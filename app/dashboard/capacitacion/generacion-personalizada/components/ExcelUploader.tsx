"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { CustomParticipant } from "@/lib/custom-participant-types";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";

interface ExcelUploaderProps {
  onParticipantsLoaded: (participants: CustomParticipant[]) => void;
}

interface ParseResult {
  success: boolean;
  count: number;
  errors: string[];
}

export function ExcelUploader({ onParticipantsLoaded }: ExcelUploaderProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setIsParsing(true);
    setParseResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const errors: string[] = [];
      const participants: CustomParticipant[] = [];

      rows.forEach((row, index) => {
        const rowNum = index + 2;

        const name = String(row["nombre"] || row["Nombre"] || row["NOMBRE"] || "").trim();
        const cedula = String(row["cedula"] || row["Cedula"] || row["CEDULA"] || row["cédula"] || "").trim();
        const nacionalidadRaw = String(row["nacionalidad"] || row["Nacionalidad"] || row["NACIONALIDAD"] || "V").trim().toUpperCase();
        const calificacionRaw = String(row["calificacion"] || row["Calificacion"] || row["CALIFICACION"] || row["calificación"] || row["Calificación"] || "0").trim();
        const nroLibroRaw = String(row["nro_libro"] || row["Nro_Libro"] || row["NRO_LIBRO"] || row["libro"] || row["Libro"] || "0").trim();
        const nroHojaRaw = String(row["nro_hoja"] || row["Nro_Hoja"] || row["NRO_HOJA"] || row["hoja"] || row["Hoja"] || "0").trim();
        const nroLineaRaw = String(row["nro_linea"] || row["Nro_Linea"] || row["NRO_LINEA"] || row["linea"] || row["Linea"] || row["línea"] || "0").trim();
        const nroControlRaw = String(row["nro_control"] || row["Nro_Control"] || row["NRO_CONTROL"] || row["control"] || row["Control"] || "0").trim();

        if (!name) {
          errors.push(`Fila ${rowNum}: Nombre vacío, se omitirá`);
          return;
        }
        if (!cedula) {
          errors.push(`Fila ${rowNum}: Cédula vacía, se omitirá`);
          return;
        }

        const nacionalidad = nacionalidadRaw.startsWith("E") ? "extranjero" : "venezolano";
        const calificacion = parseFloat(calificacionRaw) || 0;
        const nro_libro = parseInt(nroLibroRaw) || 0;
        const nro_hoja = parseInt(nroHojaRaw) || 0;
        const nro_linea = parseInt(nroLineaRaw) || 0;
        const nro_control = parseInt(nroControlRaw) || 0;

        if (nro_libro < 1) errors.push(`Fila ${rowNum}: nro_libro inválido (${nro_libro})`);
        if (nro_hoja < 1 || nro_hoja > 100) errors.push(`Fila ${rowNum}: nro_hoja fuera de rango (1-100)`);
        if (nro_linea < 1 || nro_linea > 10) errors.push(`Fila ${rowNum}: nro_linea fuera de rango (1-10)`);
        if (nro_control < 1) errors.push(`Fila ${rowNum}: nro_control inválido (${nro_control})`);

        participants.push({
          name,
          idNumber: cedula,
          nationality: nacionalidad as "venezolano" | "extranjero",
          score: calificacion,
          nro_libro,
          nro_hoja,
          nro_linea,
          nro_control,
        });
      });

      if (participants.length === 0) {
        setParseResult({
          success: false,
          count: 0,
          errors: ["No se encontraron filas válidas en el archivo"],
        });
      } else {
        onParticipantsLoaded(participants);
        setParseResult({
          success: true,
          count: participants.length,
          errors,
        });
      }
    } catch (err) {
      setParseResult({
        success: false,
        count: 0,
        errors: [`Error al leer el archivo: ${err instanceof Error ? err.message : "Error desconocido"}`],
      });
    } finally {
      setIsParsing(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
          id="excel-upload"
        />
        <label
          htmlFor="excel-upload"
          className="flex flex-col items-center gap-2 cursor-pointer"
        >
          {isParsing ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="text-sm text-gray-600">Procesando archivo...</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-blue-600">
                <Upload className="w-5 h-5" />
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Cargar Excel/CSV
              </span>
              <span className="text-xs text-gray-400">
                Arrastra o haz clic para seleccionar (.xlsx, .xls, .csv)
              </span>
            </>
          )}
        </label>
      </div>

      {parseResult && (
        <div className={`p-3 rounded-lg text-xs ${
          parseResult.success
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          <div className="flex items-center gap-2 font-medium mb-1">
            {parseResult.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {parseResult.success
              ? `${parseResult.count} participantes cargados`
              : "Error al cargar archivo"}
          </div>
          {parseResult.errors.length > 0 && (
            <ul className="ml-6 list-disc space-y-0.5 text-gray-600">
              {parseResult.errors.slice(0, 10).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {parseResult.errors.length > 10 && (
                <li className="italic">...y {parseResult.errors.length - 10} más</li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="text-xs text-gray-400">
        <p className="font-medium text-gray-500 mb-1">Columnas esperadas:</p>
        <p>nombre, cedula, nacionalidad (V/E), calificacion, nro_libro, nro_hoja, nro_linea, nro_control</p>
      </div>
    </div>
  );
}
