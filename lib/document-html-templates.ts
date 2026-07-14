import { TemplateData } from "./document-templates-new";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Load image file and convert to base64 data URI
 */
function getImageDataUri(filename: string): string {
  try {
    const imgPath = join(process.cwd(), "public", filename);
    const buffer = readFileSync(imgPath);
    const base64 = buffer.toString("base64");
    const ext = filename.split(".").pop()?.toLowerCase() || "png";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    return "";
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Build HTML for Certificación de Competencias document
 */
export function buildCertificacionCompetenciasHtml(data: TemplateData): string {
  const logoUri = getImageDataUri("logo.png");
  const footerUri = getImageDataUri("docs_footer.png");
  const watermarkUri = getImageDataUri("watermark.png");

  const tableRows = data.participantes
    .map(
      (p) => `
    <tr>
      <td>${p.index}</td>
      <td>${escapeHtml(p.nombre_apellido)}</td>
      <td>cedula: ${escapeHtml(p.cedula)}</td>
      <td>${p.puntuacion || ""}</td>
      <td>${p.condicion || ""}</td>
      <td>${escapeHtml(p.numero_control)}</td>
    </tr>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificación de Competencias</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: letter;
      margin: 0.5in;
    }

    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      background: url('${watermarkUri}') center / 500px 500px no-repeat fixed;
      background-attachment: fixed;
    }

    .page {
      position: relative;
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    .header {
      display: grid;
      grid-template-columns: 1fr 2fr 1fr;
      align-items: start;
      gap: 20px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ccc;
    }

    .logo {
      max-width: 80px;
      height: auto;
    }

    .title {
      text-align: center;
      font-weight: bold;
      font-size: 14px;
      line-height: 1.3;
    }

    .code-box {
      font-size: 6px;
      color: #8c8c8c;
      text-align: right;
    }

    .code-box div {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }

    .code-label {
      font-weight: bold;
    }

    .content {
      flex: 1;
    }

    .date-right {
      text-align: right;
      margin-bottom: 10px;
      font-size: 11px;
    }

    .recipient {
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 11px;
    }

    .body-text {
      text-align: justify;
      margin-bottom: 15px;
      font-size: 10px;
      line-height: 1.5;
    }

    .min-score {
      margin-bottom: 12px;
      font-size: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 9px;
    }

    th {
      background-color: #f5f5f5;
      border: 0.5px solid #000;
      padding: 6px 4px;
      text-align: center;
      font-weight: bold;
      font-size: 9px;
    }

    td {
      border: 0.5px solid #000;
      padding: 6px 4px;
      text-align: left;
    }

    tr {
      page-break-inside: avoid;
    }

    .signature-block {
      margin-top: 20px;
      text-align: center;
    }

    .signature-text {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 20px;
    }

    .signature-name {
      font-weight: bold;
      font-size: 10px;
      margin-top: 15px;
    }

    .footer {
      margin-top: auto;
      padding-top: 10px;
    }

    .footer-image {
      width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        ${logoUri ? `<img src="${logoUri}" alt="Logo" class="logo">` : ""}
      </div>
      <div class="title">
        CERTIFICACIÓN DE<br>COMPETENCIAS
      </div>
      <div class="code-box">
        <div><span class="code-label">CÓDIGO:</span> <span>SHA-RG-CAP-006</span></div>
        <div><span class="code-label">FECHA:</span> <span>01/04/2026</span></div>
        <div><span class="code-label">REVISIÓN:</span> <span>00</span></div>
        <div><span class="code-label">PÁGINA:</span> <span>1 de 1</span></div>
      </div>
    </div>

    <div class="content">
      <div class="date-right">Puerto La Cruz, ${escapeHtml(data.fecha || "")}</div>

      <div class="recipient">Sres. ${escapeHtml(data.nombre_cliente || "")}</div>

      <div class="body-text">
        SHA DE VENEZUELA, C.A. certifica las competencias de cada uno de los participantes descritos en el cuadro anexo, quienes asistieron al curso de ${escapeHtml(data.titulo_curso || "")}, realizado en ${escapeHtml(data.ciudad || "")} el ${escapeHtml(data.dia || "")} de ${escapeHtml(data.mes || "")} del ${escapeHtml(data.anio || "")} como parte del proceso de Capacitación bajo la Orden de Servicio Interna ${escapeHtml(data.nro_osi || "")}, en consideración de su desempeño y los resultados obtenidos en las evaluaciones efectuadas durante el mismo.
      </div>

      <div class="min-score">La nota mínima aprobatoria es de 14 puntos.</div>

      <table>
        <thead>
          <tr>
            <th>N°</th>
            <th>NOMBRE Y APELLIDO</th>
            <th>CÉDULA</th>
            <th>PUNTUACIÓN</th>
            <th>CONDICIÓN</th>
            <th>N° DE CONTROL</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div class="signature-block">
        <div class="signature-text">Atentamente,</div>
        <div class="signature-name">REPRESENTANTE SHA</div>
      </div>
    </div>

    ${footerUri ? `<div class="footer"><img src="${footerUri}" alt="Footer" class="footer-image"></div>` : ""}
  </div>
</body>
</html>
  `;
}

/**
 * Build HTML for Nota de Entrega document
 */
export function buildNotaEntregaHtml(data: TemplateData): string {
  const logoUri = getImageDataUri("logo.png");
  const footerUri = getImageDataUri("docs_footer.png");
  const watermarkUri = getImageDataUri("watermark.png");

  const tableRows = data.participantes
    .map(
      (p) => `
    <tr>
      <td>${p.index}</td>
      <td>${escapeHtml(p.nombre_apellido)}</td>
      <td>cedula: ${escapeHtml(p.cedula)}</td>
      <td>${escapeHtml(p.numero_control)}</td>
    </tr>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nota de Entrega</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: letter;
      margin: 0.5in;
    }

    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      background: url('${watermarkUri}') center / 500px 500px no-repeat fixed;
      background-attachment: fixed;
    }

    .page {
      position: relative;
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    .header {
      display: grid;
      grid-template-columns: 1fr 2fr 1fr;
      align-items: start;
      gap: 20px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ccc;
    }

    .logo {
      max-width: 80px;
      height: auto;
    }

    .title {
      text-align: center;
      font-weight: bold;
      font-size: 14px;
      line-height: 1.3;
    }

    .code-box {
      font-size: 6px;
      color: #8c8c8c;
      text-align: right;
    }

    .code-box div {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }

    .code-label {
      font-weight: bold;
    }

    .content {
      flex: 1;
    }

    .date-right {
      text-align: right;
      margin-bottom: 10px;
      font-size: 11px;
    }

    .recipient {
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 11px;
    }

    .body-text {
      text-align: justify;
      margin-bottom: 15px;
      font-size: 10px;
      line-height: 1.5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 9px;
    }

    th {
      background-color: #f5f5f5;
      border: 0.5px solid #000;
      padding: 6px 4px;
      text-align: center;
      font-weight: bold;
      font-size: 9px;
    }

    td {
      border: 0.5px solid #000;
      padding: 6px 4px;
      text-align: left;
    }

    tr {
      page-break-inside: avoid;
    }

    .signature-block {
      margin-top: 20px;
    }

    .signature-text {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 20px;
    }

    .signature-name {
      text-align: center;
      font-weight: bold;
      font-size: 10px;
      margin-top: 15px;
    }

    .received-section {
      margin-top: 20px;
      font-size: 11px;
    }

    .received-label {
      font-weight: normal;
      margin-bottom: 15px;
    }

    .signature-line {
      border-top: 1px solid #000;
      margin: 20px 0;
      width: 100px;
    }

    .seal-label {
      text-align: center;
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 5px;
    }

    .received-name {
      text-align: center;
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 5px;
    }

    .received-cargo {
      text-align: center;
      font-size: 10px;
      margin-bottom: 15px;
    }

    .footnote {
      font-style: italic;
      font-size: 8px;
      text-align: center;
      margin-top: 10px;
    }

    .footer {
      margin-top: auto;
      padding-top: 10px;
    }

    .footer-image {
      width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        ${logoUri ? `<img src="${logoUri}" alt="Logo" class="logo">` : ""}
      </div>
      <div class="title">NOTA DE ENTREGA</div>
      <div class="code-box">
        <div><span class="code-label">CÓDIGO:</span> <span>SHA-RG-CAP-006</span></div>
        <div><span class="code-label">FECHA:</span> <span>01/04/2026</span></div>
        <div><span class="code-label">REVISIÓN:</span> <span>00</span></div>
        <div><span class="code-label">PÁGINA:</span> <span>1 de 1</span></div>
      </div>
    </div>

    <div class="content">
      <div class="date-right">Puerto La Cruz, ${escapeHtml(data.fecha || "")}</div>

      <div class="recipient">Sres. ${escapeHtml(data.nombre_cliente || "")}</div>

      <div class="body-text">
        Sirva la presente para hacer entrega de CERTIFICADOS correspondientes a la formación en materia de ${escapeHtml(data.titulo_curso || "")}, realizado en ${escapeHtml(data.ciudad || "")}, el día ${escapeHtml(data.dia || "")} de ${escapeHtml(data.mes || "")} del ${escapeHtml(data.anio || "")}, como parte del proceso de Capacitación bajo la Orden de Servicio Interna ${escapeHtml(data.nro_osi || "")}, siendo aprobados los siguientes participantes:
      </div>

      <table>
        <thead>
          <tr>
            <th>N°</th>
            <th>NOMBRE Y APELLIDO</th>
            <th>CÉDULA</th>
            <th>N° DE CONTROL</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div class="signature-block">
        <div class="signature-text">Atentamente,</div>
        <div class="signature-name">REPRESENTANTE SHA</div>

        <div class="received-section">
          <div class="received-label">Recibido por:</div>
          <div style="margin-left: 40px;">
            <div class="signature-line"></div>
            <div class="seal-label">SELLO Y FIRMA DEL CLIENTE</div>
            <div class="received-name">${escapeHtml(data.nombre_recibido || "[NOMBRE Y APELLIDO]")}</div>
            <div class="received-cargo">${escapeHtml(data.cargo_recibido || "[CARGO]")}</div>
          </div>
        </div>

        <div class="footnote">
          (Devolver sellado y firmado para validar la recepción de los documentos descritos en el documento)
        </div>
      </div>
    </div>

    ${footerUri ? `<div class="footer"><img src="${footerUri}" alt="Footer" class="footer-image"></div>` : ""}
  </div>
</body>
</html>
  `;
}

/**
 * Build HTML for Validación de Datos document
 */
export function buildValidacionDatosHtml(data: TemplateData): string {
  const logoUri = getImageDataUri("logo.png");
  const footerUri = getImageDataUri("docs_footer.png");
  const watermarkUri = getImageDataUri("watermark.png");

  const tableRows = data.participantes
    .map(
      (p) => `
    <tr>
      <td>${p.index}</td>
      <td>${escapeHtml(p.nombre_apellido)}</td>
      <td>cedula: ${escapeHtml(p.cedula)}</td>
      <td>${escapeHtml(p.numero_control)}</td>
    </tr>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Validación de Datos</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: letter;
      margin: 0.5in;
    }

    body {
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      background: url('${watermarkUri}') center / 500px 500px no-repeat fixed;
      background-attachment: fixed;
    }

    .page {
      position: relative;
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    .header {
      display: grid;
      grid-template-columns: 1fr 2fr 1fr;
      align-items: start;
      gap: 20px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ccc;
    }

    .logo {
      max-width: 80px;
      height: auto;
    }

    .title {
      text-align: center;
      font-weight: bold;
      font-size: 14px;
      line-height: 1.3;
    }

    .code-box {
      font-size: 6px;
      color: #8c8c8c;
      text-align: right;
    }

    .code-box div {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }

    .code-label {
      font-weight: bold;
    }

    .content {
      flex: 1;
    }

    .date-right {
      text-align: right;
      margin-bottom: 10px;
      font-size: 11px;
    }

    .recipient {
      font-weight: bold;
      margin-bottom: 10px;
      font-size: 11px;
    }

    .body-text {
      text-align: justify;
      margin-bottom: 15px;
      font-size: 10px;
      line-height: 1.5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      font-size: 9px;
    }

    th {
      background-color: #f5f5f5;
      border: 0.5px solid #000;
      padding: 6px 4px;
      text-align: center;
      font-weight: bold;
      font-size: 9px;
    }

    td {
      border: 0.5px solid #000;
      padding: 6px 4px;
      text-align: left;
    }

    tr {
      page-break-inside: avoid;
    }

    .signature-block {
      margin-top: 20px;
      text-align: center;
    }

    .signature-text {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 20px;
    }

    .signature-name {
      font-weight: bold;
      font-size: 10px;
      margin-top: 15px;
    }

    .footer {
      margin-top: auto;
      padding-top: 10px;
    }

    .footer-image {
      width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        ${logoUri ? `<img src="${logoUri}" alt="Logo" class="logo">` : ""}
      </div>
      <div class="title">VALIDACIÓN DE DATOS</div>
      <div class="code-box">
        <div><span class="code-label">CÓDIGO:</span> <span>SHA-RG-CAP-004</span></div>
        <div><span class="code-label">FECHA:</span> <span>01/04/2026</span></div>
        <div><span class="code-label">REVISIÓN:</span> <span>00</span></div>
        <div><span class="code-label">PÁGINA:</span> <span>1 de 1</span></div>
      </div>
    </div>

    <div class="content">
      <div class="date-right">Puerto La Cruz, ${escapeHtml(data.fecha || "")}</div>

      <div class="recipient">
        ${
          data.localidad_cliente
            ? `Sres. ${escapeHtml(data.nombre_cliente || "")} – ${escapeHtml(data.localidad_cliente)}`
            : `Sres. ${escapeHtml(data.nombre_cliente || "")}`
        }
      </div>

      <div class="body-text">
        Sirva la presente para formalizar el proceso de Validación de Datos de los participantes que asistieron al curso de ${escapeHtml(data.titulo_curso || "")}, realizado en ${escapeHtml(data.localidad_cliente || data.ciudad || "")}, el (los) día (s) ${escapeHtml(data.fecha_ejecucion || data.fecha || "")}, como parte del proceso de Capacitación bajo la Orden de Servicio Interna ${escapeHtml(data.nro_osi || "")}. Recibir esta validación es indispensable para proceder a imprimir los certificados y carnet, según aplique. Este proceso es limitativo para la entrega formal y física de los mismos.
      </div>

      <table>
        <thead>
          <tr>
            <th>N°</th>
            <th>NOMBRE Y APELLIDO</th>
            <th>CÉDULA</th>
            <th>N° DE CONTROL</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div class="signature-block">
        <div class="signature-text">Atentamente,</div>
        <div class="signature-name">REPRESENTANTE SHA</div>
      </div>
    </div>

    ${footerUri ? `<div class="footer"><img src="${footerUri}" alt="Footer" class="footer-image"></div>` : ""}
  </div>
</body>
</html>
  `;
}
