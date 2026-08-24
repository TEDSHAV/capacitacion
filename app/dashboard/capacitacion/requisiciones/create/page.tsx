import {
  getAllOSIsForRequisiciones,
  getFacilitatorsForDropdown,
  getCurrentUser,
  getBanksForDropdown,
  getAllOsiSessions,
  canPlaceInterna,
  isRequisicionesLider,
} from "@/app/actions/requisiciones";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import RequisicionForm from "../components/RequisicionForm";

export const metadata = {
  title: "Nueva Requisición | PRISMA",
};

export default async function CreateRequisicionPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_SHELL_URL}/auth/login`);
  }

  const [osis, facilitators, userData, banks, osiSessions] = await Promise.all([
    getAllOSIsForRequisiciones(),
    getFacilitatorsForDropdown(),
    getCurrentUser(),
    getBanksForDropdown(),
    getAllOsiSessions(),
  ]);

  const userDept = userData?.departamentos?.nombre || "";
  const userGerencia = userData?.departamentos?.gerencia || "";
  const [canPlaceInternaFlag, isLiderFlag] = await Promise.all([
    canPlaceInterna(userDept),
    isRequisicionesLider(),
  ]);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Requisición</h1>
        <p className="text-sm text-gray-600">Complete los datos para generar una nueva solicitud.</p>
      </div>
      <RequisicionForm
        osis={osis}
        facilitators={facilitators}
        userData={userData}
        userDept={userDept}
        userGerencia={userGerencia}
        banks={banks}
        osiSessions={osiSessions}
        canPlaceInterna={canPlaceInternaFlag}
        isLider={isLiderFlag}
      />
    </div>
  );
}
