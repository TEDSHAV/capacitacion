import { CertificateData } from '@/types/dashboard'

export const generateCertificateId = (): string => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  const year = new Date().getFullYear()
  return `CERT-${year}-${random.toString().padStart(4, '0')}`
}

export const validateCertificateData = (data: CertificateData): string[] => {
  const errors: string[] = []

  if (!data.recipientName || data.recipientName.trim().length < 2) {
    errors.push('Recipient name must be at least 2 characters long')
  }

  if (!data.courseName || data.courseName.trim().length < 3) {
    errors.push('Course name must be at least 3 characters long')
  }

  if (!data.completionDate || data.completionDate.trim().length < 3) {
    errors.push('Completion date is required')
  }

  if (!data.instructorName || data.instructorName.trim().length < 2) {
    errors.push('Instructor name must be at least 2 characters long')
  }

  return errors
}

export const formatCertificateData = (data: Partial<CertificateData>): CertificateData => {
  return {
    recipientName: data.recipientName || 'Student Name',
    courseName: data.courseName || 'Course Name',
    completionDate: data.completionDate || new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    }),
    instructorName: data.instructorName || 'Instructor Name',
    certificateId: data.certificateId || generateCertificateId()
  }
}

// Simple print function for now
export const printCertificate = (elementId: string): void => {
  const element = document.getElementById(elementId)
  if (element) {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Certificate</title>
            <style>
              body { margin: 0; padding: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            ${element.innerHTML}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }
}
