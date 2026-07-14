interface ExecutionDatesProps {
  formData: any;
  isEditing: boolean;
  isNew: boolean;
  updateFormData: (field: string, value: any) => void;
}

const ExecutionDates = ({
  formData,
  isEditing,
  isNew,
  updateFormData,
}: ExecutionDatesProps) => {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-1">
        Fechas de Ejecución
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Sesiones
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.nro_sesiones || 1}
              onChange={(e) =>
                updateFormData("nro_sesiones", parseInt(e.target.value) || 1)
              }
              disabled={!isEditing && !isNew}
              tabIndex={!isEditing && !isNew ? -1 : 0}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: formData.nro_sesiones || 1 }, (_, index) => {
            const sessionNum = index + 1
            return (
              <div key={sessionNum}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Ejecución {sessionNum}
                </label>
                <input
                  type="date"
                  value={
                    formData[`fecha_ejecucion${sessionNum}`]
                      ? formData[`fecha_ejecucion${sessionNum}`] instanceof Date
                        ? formData[`fecha_ejecucion${sessionNum}`]
                            .toISOString()
                            .split("T")[0]
                        : new Date(formData[`fecha_ejecucion${sessionNum}`])
                            .toISOString()
                            .split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    updateFormData(
                      `fecha_ejecucion${sessionNum}`,
                      e.target.value ? new Date(e.target.value) : null,
                    )
                  }
                  disabled={!isEditing && !isNew}
                  tabIndex={!isEditing && !isNew ? -1 : 0}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            )
          })}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detalle de Sesión
          </label>
          <textarea
            value={formData.detalle_sesion || ""}
            onChange={(e) => updateFormData("detalle_sesion", e.target.value)}
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={3}
            placeholder="Detalle de la sesión..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dirección de Ejecución
          </label>
          <textarea
            value={formData.direccion_ejecucion || ""}
            onChange={(e) =>
              updateFormData("direccion_ejecucion", e.target.value)
            }
            disabled={!isEditing && !isNew}
            tabIndex={!isEditing && !isNew ? -1 : 0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows={2}
            placeholder="Dirección donde se ejecutará el servicio..."
          />
        </div>
      </div>
    </div>
  );
};

export default ExecutionDates;
