// Excel Export utility functions for readable Excel files

export function downloadExcelFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function createExcelHTMLContent(data: any[], headers: string[], title: string = 'Reporte'): string {
  // Create HTML table that Excel can open with proper formatting
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    table {
      border-collapse: collapse;
      width: 100%;
      font-family: Arial, sans-serif;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
      color: #333;
    }
    .number {
      text-align: right;
      font-weight: 500;
    }
    .header {
      background-color: #4472C4;
      color: white;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h2>${title}</h2>
  <p>Generado: ${new Date().toLocaleDateString('es-VE', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}</p>
  <table>
  `;

  // Add header row
  html += '<tr class="header">';
  headers.forEach(header => {
    html += `<th>${header}</th>`;
  });
  html += '</tr>';

  // Add data rows
  data.forEach(row => {
    html += '<tr>';
    headers.forEach(header => {
      const value = row[header];
      const isNumber = typeof value === 'number';
      const cellClass = isNumber ? 'number' : '';
      const displayValue = value !== null && value !== undefined ? value : '';
      
      html += `<td class="${cellClass}">${displayValue}</td>`;
    });
    html += '</tr>';
  });

  html += `
  </table>
  <p style="margin-top: 20px; font-size: 12px; color: #666;">
    Sistema de Gestión de Capacitación - Reporte Generado Automáticamente
  </p>
</body>
</html>
  `;

  return html;
}

// Specific export functions for different report types
export function exportCursosReport(data: any[]): void {
  const headers = [
    'Curso',
    'Total Certificados',
    'Calificación Promedio',
    'Horas Totales',
    'Cantidad Facilitadores',
    'Facilitadores',
    'Última Actividad'
  ];

  const excelData = data.map(item => ({
    'Curso': item.nombre,
    'Total Certificados': item.totalCertificates,
    'Calificación Promedio': item.avgScore > 0 ? parseFloat(item.avgScore.toFixed(1)) : 0,
    'Horas Totales': item.totalHours,
    'Cantidad Facilitadores': item.facilitadoresCount,
    'Facilitadores': item.facilitadores.map((f: any) => f.nombre).join('; '),
    'Última Actividad': item.lastActivity || 'N/A'
  }));

  const excelContent = createExcelHTMLContent(excelData, headers, 'Reporte de Cursos');
  downloadExcelFile(excelContent, `reporte-cursos-${new Date().toISOString().split('T')[0]}.xls`);
}

export function exportFacilitadoresReport(data: any[]): void {
  const headers = [
    'Facilitador',
    'Estado',
    'Activo',
    'Cédula',
    'Email',
    'Total Certificados',
    'Horas Totales',
    'Cursos Únicos',
    'Calificación Promedio',
    'Última Actividad'
  ];

  const excelData = data.map(item => ({
    'Facilitador': item.nombre_apellido,
    'Estado': item.estado_nombre || 'N/A',
    'Activo': item.is_active ? 'Sí' : 'No',
    'Cédula': item.cedula || '',
    'Email': item.email || '',
    'Total Certificados': item.totalCerts,
    'Horas Totales': item.totalHours,
    'Cursos Únicos': item.uniqueCourses,
    'Calificación Promedio': item.avgScore > 0 ? parseFloat(item.avgScore.toFixed(1)) : 0,
    'Última Actividad': item.lastActivity || 'N/A'
  }));

  const excelContent = createExcelHTMLContent(excelData, headers, 'Reporte de Facilitadores');
  downloadExcelFile(excelContent, `reporte-facilitadores-${new Date().toISOString().split('T')[0]}.xls`);
}

export function exportEmpresasReport(data: any[]): void {
  const headers = [
    'Empresa',
    'RIF',
    'Total Certificados',
    'Participantes Únicos',
    'Cursos Únicos',
    'Primera Actividad',
    'Última Actividad'
  ];

  const excelData = data.map(item => ({
    'Empresa': item.razon_social,
    'RIF': item.rif || '',
    'Total Certificados': item.totalCerts,
    'Participantes Únicos': item.uniqueParticipants,
    'Cursos Únicos': item.uniqueCourses,
    'Primera Actividad': item.firstActivity || 'N/A',
    'Última Actividad': item.lastActivity || 'N/A'
  }));

  const excelContent = createExcelHTMLContent(excelData, headers, 'Reporte de Empresas');
  downloadExcelFile(excelContent, `reporte-empresas-${new Date().toISOString().split('T')[0]}.xls`);
}

export function exportSurveysReport(data: any[]): void {
  const headers = [
    'OSI',
    'Empresa',
    'Servicio',
    'Dirección',
    'Fecha',
    'Cantidad Respuestas',
    'Promedio General',
    'Promedio Q1',
    'Promedio Q2',
    'Promedio Q3',
    'Promedio Q4',
    'Promedio Q5',
    'Promedio Q6',
    'Promedio Q7',
    'Promedio Q8',
    'Promedio Q9',
    'Promedio Q10'
  ];

  const excelData = data.map(item => ({
    'OSI': item.nro_osi,
    'Empresa': item.nombre_empresa,
    'Servicio': item.servicio,
    'Dirección': item.direccion_ejecucion || '',
    'Fecha': item.fecha_inicio_real,
    'Cantidad Respuestas': item.survey_count,
    'Promedio General': parseFloat(item.avg_score.toFixed(1)),
    'Promedio Q1': parseFloat((item.question_averages.q1 || 0).toFixed(1)),
    'Promedio Q2': parseFloat((item.question_averages.q2 || 0).toFixed(1)),
    'Promedio Q3': parseFloat((item.question_averages.q3 || 0).toFixed(1)),
    'Promedio Q4': parseFloat((item.question_averages.q4 || 0).toFixed(1)),
    'Promedio Q5': parseFloat((item.question_averages.q5 || 0).toFixed(1)),
    'Promedio Q6': parseFloat((item.question_averages.q6 || 0).toFixed(1)),
    'Promedio Q7': parseFloat((item.question_averages.q7 || 0).toFixed(1)),
    'Promedio Q8': parseFloat((item.question_averages.q8 || 0).toFixed(1)),
    'Promedio Q9': parseFloat((item.question_averages.q9 || 0).toFixed(1)),
    'Promedio Q10': parseFloat((item.question_averages.q10 || 0).toFixed(1))
  }));

  const excelContent = createExcelHTMLContent(excelData, headers, 'Reporte de Satisfacción');
  downloadExcelFile(excelContent, `reporte-satisfaccion-${new Date().toISOString().split('T')[0]}.xls`);
}

export function exportCarnetsReport(data: any[]): void {
  const headers = ['Métrica', 'Valor', 'Descripción'];
  
  const excelContent = createExcelHTMLContent(data, headers, 'Métricas de Carnets');
  downloadExcelFile(excelContent, `carnets-metrics-${new Date().toISOString().split('T')[0]}.xls`);
}
