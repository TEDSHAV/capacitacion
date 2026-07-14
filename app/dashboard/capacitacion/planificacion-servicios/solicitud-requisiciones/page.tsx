import ControlServiciosForm from "./components/control-servicios-form";

export default function SolicitudRequisicionesPage() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Solicitud de Requisiciones
        </h1>
        <p className="mt-2 text-gray-600">
          Registro de control de servicios ejecutados
        </p>
      </div>

      <ControlServiciosForm />
    </div>
  );
}
