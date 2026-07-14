'use client'

import { OSI, Empresa, Usuario, Contacto } from '@/types'
import OSIForm from './osi-form'
import ServiceDetails from './service-details'
import ExecutionDates from './execution-dates'
import CostCalculation from './cost-calculation'
import AdditionalInfo from './additional-info'
import OSIActionButtons from './OSIActionButtons'

interface OSIContentProps {
  formData: OSI
  isNew: boolean
  isEditing: boolean
  empresas: Empresa[]
  usuarios: Usuario[]
  contactos: Contacto[]
  servicios: any[]
  cursos: any[]
  technicalServices: any[]
  filteredEmpresas: Empresa[]
  filteredCursos: any[]
  empresaSearchTerm: string
  cursoSearchTerm: string
  updateFormData: (field: string, value: any) => void
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete: () => void
  setEmpresaSearchTerm: (term: string) => void
  setCursoSearchTerm: (term: string) => void
}

export default function OSIContent({
  formData,
  isNew,
  isEditing,
  empresas,
  usuarios,
  contactos,
  servicios,
  cursos,
  technicalServices,
  filteredEmpresas,
  filteredCursos,
  empresaSearchTerm,
  cursoSearchTerm,
  updateFormData,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  setEmpresaSearchTerm,
  setCursoSearchTerm
}: OSIContentProps) {
  return (
    <div className="p-6 space-y-6">
      <OSIForm
        initialData={formData}
        isNew={isNew}
        isEditing={isEditing}
        onEdit={onEdit}
        onCancel={onCancel}
        onSave={onSave}
        onDelete={onDelete}
        empresas={empresas}
        usuarios={usuarios}
        contactos={contactos}
        servicios={servicios}
        cursos={cursos}
        technicalServices={technicalServices}
        filteredEmpresas={filteredEmpresas}
        filteredCursos={filteredCursos}
        empresaSearchTerm={empresaSearchTerm}
        cursoSearchTerm={cursoSearchTerm}
        setEmpresaSearchTerm={setEmpresaSearchTerm}
        setCursoSearchTerm={setCursoSearchTerm}
        updateFormData={updateFormData}
      />
      
      <ServiceDetails
        formData={formData}
        isEditing={isEditing}
        isNew={isNew}
        updateFormData={updateFormData}
      />
      
      <ExecutionDates
        formData={formData}
        isEditing={isEditing}
        isNew={isNew}
        updateFormData={updateFormData}
      />
      
      <CostCalculation
        formData={formData}
        isEditing={isEditing}
        isNew={isNew}
        updateFormData={updateFormData}
      />
      
      <AdditionalInfo
        formData={formData}
        isEditing={isEditing}
        isNew={isNew}
        updateFormData={updateFormData}
      />
      
      {/* Bottom Action Buttons */}
      <div className="border-t pt-6">
        <OSIActionButtons
          isNew={isNew}
          isEditing={isEditing}
          isLoading={false}
          onSave={onSave}
          onCancel={onCancel}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}
