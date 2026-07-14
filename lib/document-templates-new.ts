import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";

export interface TemplateParticipant {
  index: number;
  nombre_apellido: string;
  cedula: string;
  nacionalidad?: "venezolano" | "extranjero";
  puntuacion?: string;
  condicion?: string;
  numero_control: string;
}

export interface TemplateData {
  fecha: string;
  nombre_cliente: string;
  titulo_curso: string;
  ciudad: string;
  dia: string;
  mes: string;
  anio: string;
  nro_osi: string;
  nombre_firmante: string;
  cargo_firmante: string;
  nombre_recibido?: string;
  cargo_recibido?: string;
  localidad?: string;
  localidad_cliente?: string;
  fecha_ejecucion?: string;
  participantes: TemplateParticipant[];
}

export class DocumentTemplateProcessor {
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(process.cwd(), "public", "templates");
  }

  private loadTemplate(templateName: string): Buffer {
    const templatePath = path.join(this.templatesPath, templateName);
    return fs.readFileSync(templatePath);
  }

  async generateCertificacionCompetencias(data: TemplateData): Promise<Buffer> {
    try {
      // Validate required fields
      if (!data.participantes || !Array.isArray(data.participantes)) {
        throw new Error("Invalid or missing participantes array");
      }

      if (!data.fecha) {
        throw new Error("Missing fecha field");
      }

      if (!data.nombre_cliente) {
        throw new Error("Missing nombre_cliente field");
      }

      const templateContent = this.loadTemplate(
        "certificacion_de_competencias.docx",
      );

      const zip = new PizZip(templateContent);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "", // Handle null values gracefully
      });

      doc.setData(data);

      try {
        doc.render();
      } catch (renderError) {
        throw renderError;
      }

      const buffer = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

      return buffer;
    } catch (error) {
      throw new Error(
        `Failed to generate certificacion de competencias document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async generateNotaEntrega(data: TemplateData): Promise<Buffer> {
    try {
      // Validate required fields
      if (!data.participantes || !Array.isArray(data.participantes)) {
        throw new Error("Invalid or missing participantes array");
      }

      if (!data.fecha) {
        throw new Error("Missing fecha field");
      }

      if (!data.nombre_cliente) {
        throw new Error("Missing nombre_cliente field");
      }

      const templateContent = this.loadTemplate("nota_de_entrega.docx");

      const zip = new PizZip(templateContent);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "", // Handle null values gracefully
      });

      doc.setData(data);

      try {
        doc.render();
      } catch (renderError) {
        throw renderError;
      }

      const buffer = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

      return buffer;
    } catch (error) {
      throw new Error(
        `Failed to generate nota de entrega document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async generateValidacionDatos(data: TemplateData): Promise<Buffer> {
    try {
      // Validate required fields
      if (!data.participantes || !Array.isArray(data.participantes)) {
        throw new Error("Invalid or missing participantes array");
      }

      if (!data.fecha) {
        throw new Error("Missing fecha field");
      }

      if (!data.nombre_cliente) {
        throw new Error("Missing nombre_cliente field");
      }

      const templateContent = this.loadTemplate("validacion_de_datos.docx");

      const zip = new PizZip(templateContent);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "", // Handle null values gracefully
      });

      doc.setData(data);

      try {
        doc.render();
      } catch (renderError) {
        throw renderError;
      }

      const buffer = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

      return buffer;
    } catch (error) {
      throw new Error(
        `Failed to generate validacion de datos document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  static formatDate(date: Date): string {
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} de ${month} de ${year}`;
  }

  static prepareTemplateData(
    certificates: any[],
    osiData: any,
    firmanteData: any,
    recibidoData?: { nombre: string; cargo: string },
  ): TemplateData {
    const currentDate = new Date();
    const formattedDate = DocumentTemplateProcessor.formatDate(currentDate);

    const participantes: TemplateParticipant[] = certificates.map(
      (cert, index) => ({
        index: index + 1,
        nombre_apellido: cert.participant_name || "",
        cedula: cert.participant_id_number || "",
        puntuacion: cert.score?.toString() || "",
        condicion: cert.score && cert.score >= 14 ? "APROBADO" : "REPROBADO",
        numero_control: cert.control_number || "",
      }),
    );

    return {
      fecha: formattedDate,
      nombre_cliente: osiData.cliente_nombre_empresa || "",
      titulo_curso: osiData.tema || "",
      ciudad: osiData.ciudad || "Puerto La Cruz",
      dia: currentDate.getDate().toString(),
      mes: currentDate.toLocaleDateString("es-ES", { month: "long" }),
      anio: currentDate.getFullYear().toString(),
      nro_osi: osiData.nro_osi || "",
      nombre_firmante: firmanteData.nombre || "",
      cargo_firmante: firmanteData.cargo || "",
      nombre_recibido: recibidoData?.nombre || "",
      cargo_recibido: recibidoData?.cargo || "",
      localidad: osiData.localidad || "",
      localidad_cliente: osiData.direccion_ejecucion || "",
      fecha_ejecucion: osiData.fecha_ejecucion || "",
      participantes,
    };
  }
}
