"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteRequisicionRecord, setRequisicionEstatus, markAllItemsVerificadas, acknowledgeRequisicionReceipt, approveRequisicionByCoordinador, rejectRequisicionByCoordinador, approveRequisicionByLider, rejectRequisicionByLider } from "@/app/actions/requisiciones";
import { Eye, Edit, Trash2, Lock, CheckCircle2, Undo2, XCircle, CalendarClock, AlertTriangle, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
import { mapGerenciaSolicitante, getRequisicionDisplayDate } from "@/lib/requisiciones-gerencia";
import MotivoModal from "./MotivoModal";

// Exact, case-insensitive department name match (trimmed).
function deptInList(deptName: string | null | undefined, list: string[]): boolean {
  if (!deptName) return false;
  const target = deptName.trim().toLowerCase();
  return list.some((d) => d.trim().toLowerCase() === target);
}

export default function RequisicionRow({
  record,
  isAdminView = false,
  osiLookup,
  isCoordinador = false,
  coordinadorDepts = [],
  isLider = false,
  liderDepts = [],
  liderFallbackDepts = [],
}: {
  record: any;
  isAdminView?: boolean;
  osiLookup?: Map<number, string>;
  isCoordinador?: boolean;
  /** Departments the current user coordinates (departamentos.coordinador). */
  coordinadorDepts?: string[];
  isLider?: boolean;
  /** All departments inside the gerencia(s) the current user leads. */
  liderDepts?: string[];
  /** Departments inside the led gerencia(s) that have NO coordinador. */
  liderFallbackDepts?: string[];
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localEstatus, setLocalEstatus] = useState<string>(record.estatus_admin || "pendiente");
  const [localItems, setLocalItems] = useState<any[]>(record.additional_items || []);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [coordinadorRejectOpen, setCoordinadorRejectOpen] = useState(false);
  const [liderRejectOpen, setLiderRejectOpen] = useState(false);

  const estatus = localEstatus;
  const isProcesada = estatus === "procesada";
  const isRechazada = estatus === "rechazada";
  const isPendiente = estatus === "pendiente";
  const isResolved = isProcesada || isRechazada;
  const isAcuseRecibido = record.acuse_recibido === true;
  const canAcknowledge = isProcesada && !isAcuseRecibido && !isAdminView;
  const isInterna =
    record.tipo_solicitud === "Interno" ||
    (!record.tipo_solicitud && !record.id_osi);
  const locked = isResolved && !isAdminView;

  // --- Lider approval: internas pending lider approval. ---
  // The lider can approve/reject internas whose departamento belongs to one of the
  // gerencias they lead. Legacy records without departamento fall back to allowing
  // any lider; the server action re-checks ownership either way.
  const liderEstatus = record.lider_estatus as string | null | undefined;
  const isLiderPendiente = isInterna && liderEstatus === "pendiente";
  const liderDeptMatches = isLider && (
    record.departamento ? deptInList(record.departamento, liderDepts) : true
  );
  const canLiderAct = isLiderPendiente && liderDeptMatches && !isAdminView;

  const handleLiderApprove = async () => {
    setIsUpdating(true);
    try {
      await approveRequisicionByLider(record.id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al aprobar");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLiderRejectConfirm = async (motivo: string) => {
    setIsUpdating(true);
    try {
      await rejectRequisicionByLider(record.id, motivo);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al rechazar");
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Coordinador approval: externas pending coordinador approval. ---
  // The coordinador of the requisicion's department can approve/reject. If the
  // department has no coordinador, the gerencia lider is the fallback approver
  // (the server action handles that check).
  const coordinadorEstatus = record.coordinador_estatus as string | null | undefined;
  const isCoordinadorPendiente = !isInterna && coordinadorEstatus === "pendiente";
  const coordinadorDeptMatches = isCoordinador && (
    record.departamento
      ? deptInList(record.departamento, coordinadorDepts)
      : true // fallback: if departamento is null (legacy), allow any coordinador
  );
  // Lider fallback for externas, but ONLY for departments that genuinely have no
  // coordinador inside the gerencia(s) this user leads.
  const canLiderFallbackAct = isCoordinadorPendiente && isLider && !isAdminView
    && !coordinadorDeptMatches
    && deptInList(record.departamento, liderFallbackDepts);
  const canCoordinadorAct = isCoordinadorPendiente && coordinadorDeptMatches && !isAdminView;
  const canExternasApproverAct = canCoordinadorAct || canLiderFallbackAct;

  const handleCoordinadorApprove = async () => {
    setIsUpdating(true);
    try {
      await approveRequisicionByCoordinador(record.id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al aprobar");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCoordinadorRejectConfirm = async (motivo: string) => {
    setIsUpdating(true);
    try {
      await rejectRequisicionByCoordinador(record.id, motivo);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al rechazar");
    } finally {
      setIsUpdating(false);
    }
  };

  const additionalItems = localItems;
  const osiFixedItems: any[] = record.osi_fixed_items || [];
  const fixedVerifiedCount = osiFixedItems.reduce((sum: number, fi: any) =>
    sum +
    (fi.verificacion_traslado === "listo" ? 1 : 0) +
    (fi.verificacion_impresion === "listo" ? 1 : 0) +
    (fi.verificacion_honorarios === "listo" ? 1 : 0) +
    (fi.verificacion_informe_final === "listo" ? 1 : 0), 0);
  const fixedTotalCount = osiFixedItems.length * 4;
  const additionalVerifiedCount = additionalItems.filter((item: any) => item.verificacion === "listo").length;
  const verifiedCount = fixedVerifiedCount + additionalVerifiedCount;
  const totalCount = fixedTotalCount + additionalItems.length;

  // Execution date badge. For capacitacion externas with a selected session,
  // prefer the session fecha over the OSI's fecha_inicio_real.
  const sesiones = (record.v_osi_formato_completo?.desglose_recursos_sesiones as any[] | null | undefined) || [];
  const selectedSesion = record.id_sesion ? sesiones.find((s) => s.id_sesion === record.id_sesion) : null;
  const executionDate = selectedSesion?.fecha || record.v_osi_formato_completo?.fecha_inicio_real;
  let executionBadge: { text: string; color: string } | null = null;
  if (executionDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exec = new Date(executionDate + "T00:00:00");
    const diffDays = Math.round((exec.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      executionBadge = { text: diffDays === 0 ? "Hoy" : `Vencida ${Math.abs(diffDays)}d`, color: "red" };
    } else if (diffDays <= 7) {
      executionBadge = { text: `Faltan ${diffDays}d`, color: "amber" };
    } else {
      executionBadge = { text: `Faltan ${diffDays}d`, color: "blue" };
    }
  }

  const handleRowClick = () => {
    router.push(`/dashboard/capacitacion/requisiciones/view/${record.id}`);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSetEstatus = async (e: React.MouseEvent, target: "pendiente" | "procesada" | "rechazada") => {
    e.stopPropagation();
    // Rejection opens the MotivoModal (requires a reason).
    if (target === "rechazada") {
      setRejectModalOpen(true);
      return;
    }
    if (target === "procesada" && totalCount > 0 && verifiedCount < totalCount) {
      if (!confirm(`Hay ${verifiedCount} de ${totalCount} items verificados. ¿Marcar todos como Listo y procesar?`)) return;
      const prevEstatus = localEstatus;
      const prevItems = localItems;
      // Optimistic: mark all as listo + set procesada
      setLocalItems(prev => prev.map(item => ({ ...item, verificacion: "listo" })));
      setLocalEstatus("procesada");
      setIsUpdating(true);
      try {
        await markAllItemsVerificadas(record.id);
        await setRequisicionEstatus(record.id, "procesada");
      } catch (error) {
        console.error("Error updating estatus:", error);
        // Rollback
        setLocalEstatus(prevEstatus);
        setLocalItems(prevItems);
        alert("Error al actualizar el estatus");
      } finally {
        setIsUpdating(false);
      }
      return;
    }
    const messages: Record<string, string> = {
      procesada: "¿Marcar esta requisición como Procesada? El solicitante ya no podrá editarla.",
      pendiente: "¿Revertir esta requisición a Pendiente?",
    };
    if (!confirm(messages[target])) return;
    const prevEstatus = localEstatus;
    // Optimistic update
    setLocalEstatus(target);
    setIsUpdating(true);
    try {
      await setRequisicionEstatus(record.id, target);
    } catch (error) {
      console.error("Error updating estatus:", error);
      // Rollback
      setLocalEstatus(prevEstatus);
      alert("Error al actualizar el estatus");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcknowledge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Confirmar la recepción de esta requisición procesada?")) return;
    setIsUpdating(true);
    try {
      await acknowledgeRequisicionReceipt(record.id);
      router.refresh();
    } catch (error) {
      console.error("Error acknowledging receipt:", error);
      alert(error instanceof Error ? error.message : "Error al confirmar la recepción");
    } finally {
      setIsUpdating(false);
    }
  };

  // Admin reject with a required reason (captured by MotivoModal).
  const handleRejectWithMotivo = async (motivo: string) => {
    const prevEstatus = localEstatus;
    setLocalEstatus("rechazada");
    setIsUpdating(true);
    try {
      await setRequisicionEstatus(record.id, "rechazada", motivo);
      router.refresh();
    } catch (error) {
      console.error("Error rejecting requisicion:", error);
      setLocalEstatus(prevEstatus);
      alert(error instanceof Error ? error.message : "Error al rechazar la requisición");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
    <tr
      onClick={handleRowClick}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {isInterna ? (
          <span className="text-gray-400 italic">N/A</span>
        ) : record.requisiciones_osis?.length > 0 ? (
          <span className="font-medium text-blue-700">
            {record.requisiciones_osis
              .map((ro: any) => osiLookup?.get(ro.id_osi) || ro.id_osi)
              .join(", ")}
          </span>
        ) : (
          record.v_osi_formato_completo?.nro_osi || "-"
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {record.solicitante || "-"}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">
        {record.departamento || mapGerenciaSolicitante(record.gerencia_solicitante) || "-"}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          isInterna ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          {isInterna ? "Interna" : "Externa"}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex items-center gap-2">
          {(() => {
            const displayDate = getRequisicionDisplayDate(record);
            return displayDate
              ? formatDate(new Date(displayDate + "T00:00:00"))
              : "-";
          })()}
          {executionBadge && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              executionBadge.color === "red" ? "bg-red-100 text-red-700" :
              executionBadge.color === "amber" ? "bg-amber-100 text-amber-700" :
              "bg-blue-100 text-blue-700"
            }`}>
              {executionBadge.color === "red" ? <AlertTriangle className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
              {executionBadge.text}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          isProcesada ? 'bg-emerald-100 text-emerald-800' : isRechazada ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {isProcesada ? "Procesada" : isRechazada ? "Rechazada" : "Pendiente"}
        </span>
        {isProcesada && isAcuseRecibido && (
          <span className="ml-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
            Recibido
          </span>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        {/* Approval status: internas show lider_estatus, externas show coordinador_estatus */}
        {isInterna && record.lider_estatus ? (
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
            record.lider_estatus === "aprobada" ? 'bg-blue-100 text-blue-800'
            : record.lider_estatus === "rechazada" ? 'bg-red-100 text-red-800'
            : 'bg-amber-100 text-amber-800'
          }`}>
            {record.lider_estatus === "aprobada" ? "Aprobada (Lider)"
              : record.lider_estatus === "rechazada" ? "Rechazada (Lider)"
              : "Pendiente (Lider)"}
          </span>
        ) : !isInterna && record.coordinador_estatus ? (
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
            record.coordinador_estatus === "aprobada" ? 'bg-blue-100 text-blue-800'
            : record.coordinador_estatus === "rechazada" ? 'bg-red-100 text-red-800'
            : 'bg-amber-100 text-amber-800'
          }`}>
            {record.coordinador_estatus === "aprobada" ? "Aprobada (Coord.)"
              : record.coordinador_estatus === "rechazada" ? "Rechazada (Coord.)"
              : "Pendiente (Coord.)"}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
        {totalCount > 0 ? (
          <span className={`text-xs font-bold ${
            verifiedCount === totalCount ? "text-emerald-600" : verifiedCount > 0 ? "text-amber-600" : "text-gray-400"
          }`}>
            {verifiedCount}/{totalCount}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" onClick={handleActionClick}>
        <div className="flex gap-1 items-center justify-center">
          <Link href={`/dashboard/capacitacion/requisiciones/view/${record.id}`}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-gray-600 hover:text-gray-900" 
              title="Ver"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {!isAdminView && locked ? (
            <span
              className="h-8 w-8 flex items-center justify-center text-gray-400"
              title="Procesada por Administración: bloqueada para edición"
            >
              <Lock className="h-4 w-4" />
            </span>
          ) : !isAdminView ? (
            <>
              <Link href={`/dashboard/capacitacion/requisiciones/edit/${record.id}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800" title="Editar">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (confirm("¿Está seguro de que desea eliminar este registro?")) {
                    await deleteRequisicionRecord(record.id);
                    router.refresh();
                  }
                }}
              >
                <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : null}
          {/* Lider approve/reject for pending internas */}
          {canLiderAct && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isUpdating}
                onClick={handleLiderApprove}
                className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                title="Aprobar (Lider)"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isUpdating}
                onClick={() => setLiderRejectOpen(true)}
                className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                title="Rechazar (Lider)"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {/* Coordinador (or lider fallback) approve/reject for pending externas */}
          {canExternasApproverAct && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isUpdating}
                onClick={handleCoordinadorApprove}
                className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                title={canLiderFallbackAct ? "Aprobar (Lider - sin coordinador)" : "Aprobar (Coordinador)"}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isUpdating}
                onClick={() => setCoordinadorRejectOpen(true)}
                className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                title={canLiderFallbackAct ? "Rechazar (Lider - sin coordinador)" : "Rechazar (Coordinador)"}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {isAdminView && isPendiente && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isUpdating}
                onClick={(e) => handleSetEstatus(e, "procesada")}
                className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                title="Procesar"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isUpdating}
                onClick={(e) => handleSetEstatus(e, "rechazada")}
                className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                title="Rechazar"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {isAdminView && isResolved && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isUpdating}
              onClick={(e) => handleSetEstatus(e, "pendiente")}
              className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
              title="Revertir"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          )}
          {canAcknowledge && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isUpdating}
              onClick={handleAcknowledge}
              className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              title="Confirmar Recepción"
            >
              <PackageCheck className="h-4 w-4" />
            </Button>
          )}
          {isProcesada && isAcuseRecibido && !isAdminView && (
            <span
              className="h-8 w-8 flex items-center justify-center text-emerald-600"
              title="Recepción confirmada"
            >
              <PackageCheck className="h-4 w-4" />
            </span>
          )}
        </div>
      </td>
    </tr>
    {typeof document !== "undefined" && createPortal(
      <MotivoModal
        open={rejectModalOpen}
        title="Rechazar Requisición"
        description="El solicitante será notificado con el motivo del rechazo."
        confirmLabel="Rechazar"
        onConfirm={handleRejectWithMotivo}
        onClose={() => setRejectModalOpen(false)}
      />,
      document.body,
    )}
    {typeof document !== "undefined" && createPortal(
      <MotivoModal
        open={coordinadorRejectOpen}
        title="Rechazar Requisición (Coordinador)"
        description="El solicitante será notificado con el motivo del rechazo del coordinador."
        confirmLabel="Rechazar"
        onConfirm={handleCoordinadorRejectConfirm}
        onClose={() => setCoordinadorRejectOpen(false)}
      />,
      document.body,
    )}
    {typeof document !== "undefined" && createPortal(
      <MotivoModal
        open={liderRejectOpen}
        title="Rechazar Requisición (Lider)"
        description="El solicitante será notificado con el motivo del rechazo del lider."
        confirmLabel="Rechazar"
        onConfirm={handleLiderRejectConfirm}
        onClose={() => setLiderRejectOpen(false)}
      />,
      document.body,
    )}
    </>
  );
}
