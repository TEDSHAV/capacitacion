"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import ErrorDialog, { useErrorDialog } from "@/components/ui/error-dialog";
import { getDashboardStats } from "../../actions/dashboard";

export default function NegociosPage() {
  const router = useRouter();
  const errorDialog = useErrorDialog();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOSIs: 0,
    osisActivas: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Fetch stats from server action
        const result = await getDashboardStats();
        
        setStats({
          totalOSIs: result.stats?.totalOSIs || 0,
          osisActivas: result.stats?.osisActivas || 0,
        });
      } catch (error) {
        console.error("Error loading data:", error);
        errorDialog.showError(
          "Error al cargar los datos del dashboard",
          error instanceof Error ? error.message : String(error),
          "Error de Carga",
        );
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session?.user) {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Departamento de Negocios
            </h1>
            <p className="mt-2 text-gray-600">Gestión integral de OSIs</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-2">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total OSIs</p>
                <p className="text-xl font-semibold text-gray-900">
                  {stats.totalOSIs}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-emerald-100 rounded-lg p-2">
                <svg
                  className="h-5 w-5 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">
                  OSIs Activas
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {stats.osisActivas}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Module List */}
        <div className="space-y-4">
          <div
            onClick={() => router.push("/dashboard/negocios/gestion-de-osis")}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md cursor-pointer transition-all duration-200 group"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-3 group-hover:from-blue-600 group-hover:to-blue-700 transition-colors">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Gestión de OSIs
                    </h3>
                    <p className="text-sm text-gray-600">
                      Administración de Órdenes de Servicio Internas, creación,
                      seguimiento y gestión de estados.
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {stats.totalOSIs}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/dashboard/negocios/gestion-de-osis");
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
                    >
                      Acceder
                      <svg
                        className="w-4 h-4 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        title={errorDialog.title}
        message={errorDialog.message}
        details={errorDialog.details}
        onClose={errorDialog.close}
        variant={errorDialog.variant}
      />
    </>
  );
}
