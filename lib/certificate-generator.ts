import jsPDF from 'jspdf'
import { CertificateParticipant, CertificateGeneration } from '@/types'

interface CertificateData {
  participant: CertificateParticipant
  certificateData: CertificateGeneration
  templateImage: string
  sealImage?: string
}

export class CertificateGenerator {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number

  constructor() {
    this.doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
  }

  async generateCertificate(data: CertificateData): Promise<Blob> {
    const { participant, certificateData, templateImage, sealImage } = data

    // Clear any existing content
    this.doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    // Page 1: Certificate
    await this.addCertificatePage(templateImage, participant, certificateData)

    // Add new page for content
    this.doc.addPage()

    // Page 2: Content table with seal
    await this.addContentPage(participant, certificateData, sealImage)

    // Return as blob
    return this.doc.output('blob')
  }

  private async addCertificatePage(
    templateImage: string,
    participant: CertificateParticipant,
    certificateData: CertificateGeneration
  ): Promise<void> {
    // Add template background
    await this.addTemplate(templateImage)

    // Add certificate content
    await this.addCertificateContent(participant, certificateData)
  }

  private async addContentPage(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration,
    sealImage?: string
  ): Promise<void> {
    // Add "CONTENIDO" title at center
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(20)
    this.doc.text('CONTENIDO', this.pageWidth / 2, 30, { align: 'center' })

    // Define column positions
    const leftColumnX = 20
    const rightColumnX = this.pageWidth / 2 + 20
    const columnWidth = (this.pageWidth / 2) - 40
    const lineHeight = 6
    let currentY = 50

    // Draw column separator line
    this.doc.setDrawColor(200, 200, 200)
    this.doc.line(this.pageWidth / 2, 40, this.pageWidth / 2, this.pageHeight - 20)

    // Left column: Course content
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(11)
    
    if (certificateData.course_content) {
      const contentLines = this.doc.splitTextToSize(
        certificateData.course_content,
        columnWidth
      )
      
      contentLines.forEach((line: string) => {
        this.doc.text(line, leftColumnX, currentY)
        currentY += lineHeight
      })
    }

    // Right column: Table with seal
    currentY = 50

    // Draw table border
    this.doc.setDrawColor(100, 100, 100)
    this.doc.rect(rightColumnX - 5, currentY - 10, columnWidth + 10, 120)

    // Table header
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(12)
    this.doc.text('REGISTRO', rightColumnX, currentY)
    currentY += lineHeight

    // Draw horizontal line after header
    this.doc.setDrawColor(150, 150, 150)
    this.doc.line(rightColumnX - 5, currentY + 2, rightColumnX + columnWidth + 5, currentY + 2)
    currentY += lineHeight * 2

    // First row: Libro Nro
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(11)
    this.doc.text('Libro Nro: 100', rightColumnX, currentY)
    currentY += lineHeight

    // First row: Nro. Control
    this.doc.text('Nro. Control: 321213', rightColumnX, currentY)
    currentY += lineHeight

    // Second row: Fecha de Ejecución
    const executionDate = certificateData.date ? 
      new Date(certificateData.date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      }) : 
      new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      })
    this.doc.text(`Fecha de Ejecución: ${executionDate}`, rightColumnX, currentY)
    currentY += lineHeight

    // Second row: Hoja Nro
    this.doc.text('Hoja Nro: 1', rightColumnX, currentY)
    currentY += lineHeight

    // Second row: Month
    const month = certificateData.date ? 
      new Date(certificateData.date).toLocaleDateString('es-ES', { month: 'long' }) : 
      new Date().toLocaleDateString('es-ES', { month: 'long' })
    this.doc.text(`Mes: ${month}`, rightColumnX, currentY)
    currentY += lineHeight * 2 // Extra space before seal

    // Third row: CI and Nombre
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(`CI: ${participant.id_type || 'V-'}${participant.id_number}`, rightColumnX, currentY)
    currentY += lineHeight
    this.doc.text(`Nombre: ${participant.name}`, rightColumnX, currentY)
    currentY += lineHeight * 2 // Space for seal

    // Add seal image if provided
    if (sealImage) {
      try {
        await this.addSealImage(sealImage, rightColumnX + 10, currentY)
      } catch (error) {
        console.error('Error adding seal image:', error)
        // Fallback: draw a placeholder rectangle
        this.doc.setDrawColor(200, 200, 200)
        this.doc.rect(rightColumnX + 10, currentY, 40, 40)
        this.doc.setFont('helvetica', 'italic')
        this.doc.setFontSize(8)
        this.doc.text('Sello', rightColumnX + 30, currentY + 20, { align: 'center' })
      }
    }
  }

  private async addTemplate(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        // Add image to cover entire page
        this.doc.addImage(img, 'PNG', 0, 0, this.pageWidth, this.pageHeight)
        resolve()
      }
      img.onerror = reject
      img.src = imageUrl
    })
  }

  private async addSealImage(imageUrl: string, x: number, y: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        // Add seal image with reasonable size (40x40mm)
        this.doc.addImage(img, 'PNG', x, y, 40, 40)
        resolve()
      }
      img.onerror = reject
      img.src = imageUrl
    })
  }

  private async addCertificateContent(
    participant: CertificateParticipant,
    certificateData: CertificateGeneration
  ): Promise<void> {
    const { name, id_type, id_number } = participant
    const { certificate_title, certificate_subtitle, date } = certificateData

    // Set font styles
    this.doc.setFont('helvetica', 'bold')
    
    // Participant name - centered and larger
    const nameFontSize = this.calculateFontSize(name, 40)
    this.doc.setFontSize(nameFontSize)
    this.doc.text(name, this.pageWidth / 2, 110, { align: 'center' })

    // ID information
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(14)
    const idText = `${id_type || 'V-'}${id_number}`
    this.doc.text(idText, this.pageWidth / 2, 125, { align: 'center' })

    // Certificate title
    if (certificate_title) {
      this.doc.setFont('helvetica', 'bold')
      const titleFontSize = this.calculateFontSize(certificate_title, 24)
      this.doc.setFontSize(titleFontSize)
      this.doc.text(certificate_title, this.pageWidth / 2, 90, { align: 'center' })
    }

    // Certificate subtitle
    if (certificate_subtitle) {
      this.doc.setFont('helvetica', 'normal')
      const subtitleFontSize = this.calculateFontSize(certificate_subtitle, 16)
      this.doc.setFontSize(subtitleFontSize)
      this.doc.text(certificate_subtitle, this.pageWidth / 2, 100, { align: 'center' })
    }

    // Date
    if (date) {
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(12)
      const formattedDate = new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      this.doc.text(`Fecha: ${formattedDate}`, this.pageWidth / 2, 140, { align: 'center' })
    }

    // Add status badge if participant has a score
    if (participant.score !== undefined && participant.score !== null) {
      const status = participant.score >= (certificateData.passing_grade || 0) ? 'APROBADO' : 'ASISTENCIA'
      const statusColor = participant.score >= (certificateData.passing_grade || 0) ? [0, 128, 0] : [255, 165, 0] // Green or Orange
      
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(16)
      this.doc.setTextColor(...statusColor)
      this.doc.text(status, this.pageWidth / 2, 155, { align: 'center' })
      
      // Reset text color to black
      this.doc.setTextColor(0, 0, 0)
    }
  }

  private calculateFontSize(text: string, maxFontSize: number): number {
    // Simple font size calculation based on text length
    const textLength = text.length
    if (textLength <= 20) return maxFontSize
    if (textLength <= 30) return maxFontSize - 4
    if (textLength <= 40) return maxFontSize - 8
    if (textLength <= 50) return maxFontSize - 12
    return Math.max(maxFontSize - 16, 12)
  }

  async generateMultipleCertificates(
    participants: CertificateParticipant[],
    certificateData: CertificateGeneration,
    templateImage: string,
    sealImage?: string
  ): Promise<{ participant: CertificateParticipant; blob: Blob }[]> {
    const certificates: { participant: CertificateParticipant; blob: Blob }[] = []

    for (const participant of participants) {
      try {
        const blob = await this.generateCertificate({
          participant,
          certificateData,
          templateImage,
          sealImage
        })
        certificates.push({ participant, blob })
      } catch (error) {
        console.error(`Error generating certificate for ${participant.name}:`, error)
        // Continue with other participants even if one fails
      }
    }

    return certificates
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}
