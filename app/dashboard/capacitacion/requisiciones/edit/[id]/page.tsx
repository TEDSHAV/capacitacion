import {
  getAllOSIsForRequisiciones,
  getFacilitatorsForDropdown,
  getCurrentUser,
  getBanksForDropdown,
  getRequisicionRecord,
  isRequisicionesAdmin,
  getAllOsiSessions,
  canPlaceInterna,
  isRequisicionesLider,
} from "@/app/actions/requisiciones";
import RequisicionForm from "../../components/RequisicionForm";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Editar Requisición | PRISMA",
};

export default async function EditRequisicionPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  const isAdmin = await isRequisicionesAdmin();
  if (isAdmin) {
    redirect(`/dashboard/capacitacion/requisiciones/view/${id}`);
  }

  const [osis, facilitators, userData, editRecord, banks, osiSessions] = await Promise.all([
    getAllOSIsForRequisiciones(),
    getFacilitatorsForDropdown(),
    getCurrentUser(),
    getRequisicionRecord(parseInt(id)),
    getBanksForDropdown(),
    getAllOsiSessions(),
  ]);

  if (!editRecord) {
    notFound();
  }

  const userDept = userData?.departamentos?.nombre || "";
  const userGerencia = userData?.departamentos?.gerencia || "";
  const adminResolved = editRecord?.estatus_admin === "procesada" || editRecord?.estatus_admin === "rechazada";
  const coordinadorResolved = editRecord?.coordinador_estatus === "rechazada" || editRecord?.coordinador_estatus === "aprobada";
  const liderResolved = editRecord?.lider_estatus === "rechazada" || editRecord?.lider_estatus === "aprobada";
  const approverEdited = editRecord?.aprobador_edito === true;
  const isLocked = adminResolved || coordinadorResolved || liderResolved || approverEdited;

  // Determine the specific lock reason for an accurate message.
  let lockReason = "";
  if (adminResolved) {
    lockReason = editRecord?.estatus_admin === "rechazada"
      ? "Rechazada por Administración"
      : "Procesada por Administración";
  } else if (approverEdited) {
    lockReason = "Modificada por el Aprobador";
  } else if (liderResolved) {
    lockReason = editRecord?.lider_estatus === "rechazada"
      ? "Rechazada por el Lider"
      : "Aprobada por el Lider (pendiente por Administración)";
  } else if (coordinadorResolved) {
    lockReason = editRecord?.coordinador_estatus === "rechazada"
      ? "Rechazada por el Coordinador"
      : "Aprobada por el Coordinador (pendiente por Administración)";
  }

  const [canPlaceInternaFlag, isLiderFlag] = await Promise.all([
    canPlaceInterna(userDept),
    isRequisicionesLider(),
  ]);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Editar Requisición</h1>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
            editRecord?.tipo_solicitud === "Interno"
              ? "bg-blue-100 text-blue-800"
              : "bg-green-100 text-green-800"
          }`}>
            {editRecord?.tipo_solicitud === "Interno" ? "Interna" : "Externa"}
          </span>
        </div>
        <p className="text-sm text-gray-600">Actualice los datos de la solicitud.</p>
      </div>
      <RequisicionForm
        osis={osis}
        facilitators={facilitators}
        userData={userData}
        editRecord={editRecord}
        userDept={userDept}
        userGerencia={userGerencia}
        isLocked={isLocked}
        lockReason={lockReason}
        banks={banks}
        osiSessions={osiSessions}
        canPlaceInterna={canPlaceInternaFlag}
        isLider={isLiderFlag}
      />
    </div>
  );
}
