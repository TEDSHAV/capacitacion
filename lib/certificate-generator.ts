import jsPDF from 'jspdf'
import { CertificateParticipant, CertificateGeneration } from '@/types'

interface CertificateData {
  participant: CertificateParticipant
  certificateData: CertificateGeneration
  templateImage: string
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
    const { participant, certificateData, templateImage } = data

    // Clear any existing content
    this.doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    // Add template background
    await this.addTemplate(templateImage)

    // Add certificate content
    await this.addCertificateContent(participant, certificateData)

    // Return as blob
    return this.doc.output('blob')
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
    templateImage: string
  ): Promise<{ participant: CertificateParticipant; blob: Blob }[]> {
    const certificates: { participant: CertificateParticipant; blob: Blob }[] = []

    for (const participant of participants) {
      try {
        const blob = await this.generateCertificate({
          participant,
          certificateData,
          templateImage
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
