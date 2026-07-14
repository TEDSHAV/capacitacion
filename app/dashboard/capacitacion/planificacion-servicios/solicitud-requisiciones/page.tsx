import ControlServiciosForm from "./components/control-servicios-form";
import { 
  getAllOSIsForControlServicios, 
  getFacilitatorsForDropdown, 
  getCurrentUser,
  getControlServiciosRecord
} from "@/app/actions/control-servicios";

export default async function SolicitudRequisicionesPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const params = await searchParams;
  const editId = params.edit as string | undefined;

  // Fetch all data in parallel on the server
  const [osis, facilitators, userData, editRecord] = await Promise.all([
    getAllOSIsForControlServicios(),
    getFacilitatorsForDropdown(),
    getCurrentUser(),
    editId ? getControlServiciosRecord(parseInt(editId)) : Promise.resolve(null)
  ]);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {editId ? "Editar Requisición" : "Solicitud de Requisiciones"}
        </h1>
      </div>

      <ControlServiciosForm 
        osis={osis} 
        facilitators={facilitators} 
        userData={userData}
        editRecord={editRecord}
      />
    </div>
  );
}
