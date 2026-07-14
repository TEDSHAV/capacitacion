"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteControlServiciosRecord } from "@/app/actions/control-servicios";
import { Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RequisicionRow({ record }: { record: any }) {
  const router = useRouter();

  const handleRowClick = () => {
    window.parent.location.href = `/requisiciones/view/${record.id}`;
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <tr 
      onClick={handleRowClick}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
        {record.nro_correlativo || "-"}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {record.numero_osi ||
          record.ejecucion_osi?.nro_osi_secuencial ||
          "-"}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {record.solicitante || "-"}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">
        {record.gerencia_solicitante || "-"}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          record.tipo_solicitud === 'Interno' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          {record.tipo_solicitud || "-"}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {record.fecha_solicitud
          ? new Date(record.fecha_solicitud).toLocaleDateString()
          : "-"}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" onClick={handleActionClick}>
        <div className="flex gap-1">
          <a href={`/requisiciones/view/${record.id}`} target="_parent">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-gray-900" title="Ver">
              <Eye className="h-4 w-4" />
            </Button>
          </a>
          <a href={`/requisiciones/edit/${record.id}`} target="_parent">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800" title="Editar">
              <Edit className="h-4 w-4" />
            </Button>
          </a>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (confirm("¿Está seguro de que desea eliminar este registro?")) {
                await deleteControlServiciosRecord(record.id);
              }
            }}
          >
            <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800" title="Eliminar">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </td>
    </tr>
  );
}
