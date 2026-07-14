interface FileUploadSectionProps {
  resumeFile: File | null;
  signatureFile: File | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>, fileType: "resume" | "signature") => void;
}

export const FileUploadSection = ({ resumeFile, signatureFile, onFileSelect }: FileUploadSectionProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Archivos Adjuntos</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resume Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currículum Vitae
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => onFileSelect(e, "resume")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Formatos aceptados: PDF, DOC, DOCX (Máx. 10MB)
          </p>
          {resumeFile && (
            <p className="text-sm text-green-600 mt-1">
              ✓ {resumeFile.name} ({(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Signature Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Firma Digital
          </label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.gif"
            onChange={(e) => onFileSelect(e, "signature")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Formatos aceptados: PNG, JPG, GIF (Máx. 5MB)
          </p>
          {signatureFile && (
            <p className="text-sm text-green-600 mt-1">
              ✓ {signatureFile.name} ({(signatureFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
      </div>
      
      <p className="text-xs text-gray-500">
        El currículum se almacenará para referencia y la firma se usará en los certificados generados.
      </p>
    </div>
  );
};
