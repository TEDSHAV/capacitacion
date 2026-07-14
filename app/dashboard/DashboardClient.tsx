"use client";

import { useRouter } from "next/navigation";
import { memo, useState, useEffect } from "react";
import { DashboardClientProps, StatCard, ActivityItem } from "@/types/dashboard";
import { Users, CheckCircle, BookOpen, Clock, TrendingUp, TrendingDown, BarChart3, Settings, Megaphone, FileText } from "lucide-react";

const DashboardClient = ({
  user,
}: DashboardClientProps) => {
  const router = useRouter();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats([
        {
          title: "Total Clientes",
          value: "1,248",
          change: 12.5,
          icon: <Users className="w-6 h-6" />,
          color: "blue"
        },
        {
          title: "OSIs Activas", 
          value: "342",
          change: 8.2,
          icon: <CheckCircle className="w-6 h-6" />,
          color: "green"
        },
        {
          title: "Cursos Completados",
          value: "89",
          change: -2.3,
          icon: <BookOpen className="w-6 h-6" />,
          color: "purple"
        },
        {
          title: "Tareas Pendientes",
          value: "27",
          change: -15.7,
          icon: <Clock className="w-6 h-6" />,
          color: "yellow"
        }
      ]);

      setRecentActivity([
        {
          id: "1",
          type: "course",
          description: "Nuevo curso 'Seguridad Industrial' creado",
          time: "Hace 5 min",
          user: "Carlos Rodríguez"
        },
        {
          id: "2", 
          type: "client",
          description: "Cliente 'Tech Solutions' registrado",
          time: "Hace 15 min",
          user: "Ana Martínez"
        },
        {
          id: "3",
          type: "osi",
          description: "OSI-2024-089 marcada como completada",
          time: "Hace 1 hora",
          user: "Luis Gómez"
        }
      ]);

      setIsLoading(false);
    };

    fetchData();
  }, []);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-gray-600">No autenticado</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Bienvenido, {user.user_metadata?.name || 'Usuario'}
              </h1>
              <p className="mt-2 text-gray-600">
                Resumen de métricas y actividad del sistema
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Última actualización</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`text-2xl mr-3`}>{stat.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                  <div className={`text-sm font-medium flex items-center ${
                    stat.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {Math.abs(stat.change)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/dashboard/capacitacion/gestion-cursos')}
                  className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 text-left group"
                >
                  <div className="flex-shrink-0 bg-blue-500 rounded-md p-2 mr-3 group-hover:bg-blue-600 transition-colors">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Gestionar Cursos</h3>
                    <p className="text-sm text-gray-600">Crear y administrar cursos</p>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/dashboard/administracion')}
                  className="flex items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 text-left group"
                >
                  <div className="flex-shrink-0 bg-green-500 rounded-md p-2 mr-3 group-hover:bg-green-600 transition-colors">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Administración</h3>
                    <p className="text-sm text-gray-600">Gestionar usuarios y permisos</p>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/dashboard/marketing')}
                  className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 text-left group"
                >
                  <div className="flex-shrink-0 bg-purple-500 rounded-md p-2 mr-3 group-hover:bg-purple-600 transition-colors">
                    <Megaphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Marketing</h3>
                    <p className="text-sm text-gray-600">Campañas y promociones</p>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/dashboard/capacitacion')}
                  className="flex items-center p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg hover:from-yellow-100 hover:to-yellow-200 transition-all duration-200 text-left group"
                >
                  <div className="flex-shrink-0 bg-yellow-500 rounded-md p-2 mr-3 group-hover:bg-yellow-600 transition-colors">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Reportes</h3>
                    <p className="text-sm text-gray-600">Estadísticas y análisis</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Chart Placeholder */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
              <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Gráfico de actividad en desarrollo</p>
                  <p className="text-sm text-gray-500 mt-1">Próximamente disponible</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h2>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0">
                      <div className={`flex-shrink-0 rounded-full p-2 ${
                        activity.type === 'course' ? 'bg-blue-100' :
                        activity.type === 'client' ? 'bg-green-100' :
                        'bg-yellow-100'
                      }`}>
                        {activity.type === 'course' ? <BookOpen className="w-4 h-4 text-blue-600" /> :
                         activity.type === 'client' ? <Users className="w-4 h-4 text-green-600" /> : <CheckCircle className="w-4 h-4 text-yellow-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">{activity.user} • {activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System Status */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado del Sistema</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Base de datos</span>
                  <span className="flex items-center text-sm text-green-600">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    Operativa
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API</span>
                  <span className="flex items-center text-sm text-green-600">
                    <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    Normal
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Almacenamiento</span>
                  <span className="flex items-center text-sm text-yellow-600">
                    <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
                    78%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(DashboardClient);
