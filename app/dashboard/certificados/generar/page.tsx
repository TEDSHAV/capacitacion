'use client'

import React, { useState } from 'react'
import CertificateTemplate from '@/components/CertificateTemplate'
import { Button } from '@/components/ui/button'
import { printCertificate, generateCertificateId } from '@/utils/certificate-generator'
import { CertificateData } from '@/types/dashboard'

export default function CertificateGenerator() {
  const [certificateData, setCertificateData] = useState<CertificateData>({
    recipientName: 'John Doe',
    courseName: 'Advanced React Development',
    completionDate: 'December 2024',
    instructorName: 'Dr. Jane Smith',
    certificateId: 'CERT-2024-001'
  })

  const [isPreviewMode, setIsPreviewMode] = useState(true)

  const handleInputChange = (field: keyof CertificateData, value: string) => {
    setCertificateData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateCertificateId = () => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `CERT-${new Date().getFullYear()}-${random}`
  }

  const handleGenerate = () => {
    setCertificateData(prev => ({
      ...prev,
      certificateId: generateCertificateId()
    }))
    setIsPreviewMode(false)
  }

  const handlePrint = () => {
    printCertificate('certificate-preview')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Certificate Generator
        </h1>

        {/* Form Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Certificate Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                value={certificateData.recipientName}
                onChange={(e) => handleInputChange('recipientName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Name
              </label>
              <input
                type="text"
                value={certificateData.courseName}
                onChange={(e) => handleInputChange('courseName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completion Date
              </label>
              <input
                type="text"
                value={certificateData.completionDate}
                onChange={(e) => handleInputChange('completionDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="December 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructor Name
              </label>
              <input
                type="text"
                value={certificateData.instructorName}
                onChange={(e) => handleInputChange('instructorName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Button onClick={handleGenerate}>
              Generate Certificate
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              Print Certificate
            </Button>
          </div>
        </div>

        {/* Certificate Preview */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Certificate Preview
          </h2>
          
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
            <div id="certificate-preview">
              <CertificateTemplate data={certificateData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
