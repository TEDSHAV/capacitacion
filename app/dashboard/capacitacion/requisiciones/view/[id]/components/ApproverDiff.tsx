"use client";

import { AlertTriangle } from "lucide-react";

// Compares the original_snapshot (captured at creation / last creator save) with
// the current live record and renders a human-readable diff so the solicitor can
// see exactly what the approver changed before approving.
//
// Only fields that differ are shown. Unchanged fields are hidden to keep the
// diff focused. Items are matched by `id` when present; otherwise by index.

type RequisicionItem = {
  id: string;
  cant: number;
  unidad: string;
  descripcion: string;
  costo_unitario: number;
  total: number;
  id_osi?: number | null;
};

const SCALAR_LABELS: Record<string, string> = {
  observaciones_compras: "Observaciones",
  prioridad: "Prioridad",
  corresponde_a: "Corresponde a",
  fecha_solicitud: "Fecha de solicitud",
  solicitante: "Solicitante",
  departamento: "Departamento",
  gerencia_solicitante: "Gerencia solicitante",
  tipo_servicio: "Tipo de servicio",
};

function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.length ? `${value.length} item(s)` : "Sin items";
  return String(value);
}

function itemsEqual(a: RequisicionItem, b: RequisicionItem): boolean {
  return (
    a.cant === b.cant &&
    a.unidad === b.unidad &&
    a.descripcion === b.descripcion &&
    a.costo_unitario === b.costo_unitario &&
    a.total === b.total
  );
}

export default function ApproverDiff({
  originalSnapshot,
  currentRecord,
  approverName,
  approverAt,
}: {
  originalSnapshot: Record<string, any> | null | undefined;
  currentRecord: any;
  approverName?: string | null;
  approverAt?: string | null;
}) {
  if (!originalSnapshot) return null;

  const scalarChanges: { label: string; oldVal: string; newVal: string }[] = [];
  for (const [key, label] of Object.entries(SCALAR_LABELS)) {
    const oldVal = originalSnapshot[key];
    const newVal = currentRecord[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      scalarChanges.push({
        label,
        oldVal: formatValue(oldVal),
        newVal: formatValue(newVal),
      });
    }
  }

  // Diff additional_items
  const oldItems: RequisicionItem[] = (originalSnapshot.additional_items || []) as RequisicionItem[];
  const newItems: RequisicionItem[] = (currentRecord.additional_items || []) as RequisicionItem[];

  const oldById = new Map(oldItems.map((i) => [i.id, i]));
  const newById = new Map(newItems.map((i) => [i.id, i]));

  const addedItems: RequisicionItem[] = [];
  const removedItems: RequisicionItem[] = [];
  const modifiedItems: { oldItem: RequisicionItem; newItem: RequisicionItem; changes: string[] }[] = [];

  for (const newItem of newItems) {
    const oldItem = oldById.get(newItem.id);
    if (!oldItem) {
      addedItems.push(newItem);
    } else if (!itemsEqual(oldItem, newItem)) {
      const changes: string[] = [];
      if (oldItem.cant !== newItem.cant) changes.push(`Cantidad: ${oldItem.cant} → ${newItem.cant}`);
      if (oldItem.unidad !== newItem.unidad) changes.push(`Unidad: ${oldItem.unidad || "—"} → ${newItem.unidad || "—"}`);
      if (oldItem.descripcion !== newItem.descripcion) changes.push(`Descripción modificada`);
      if (oldItem.costo_unitario !== newItem.costo_unitario) changes.push(`Costo unit.: $${oldItem.costo_unitario || 0} → $${newItem.costo_unitario || 0}`);
      if (oldItem.total !== newItem.total) changes.push(`Total: $${oldItem.total || 0} → $${newItem.total || 0}`);
      modifiedItems.push({ oldItem, newItem, changes });
    }
  }
  for (const oldItem of oldItems) {
    if (!newById.has(oldItem.id)) {
      removedItems.push(oldItem);
    }
  }

  const hasItemChanges = addedItems.length > 0 || removedItems.length > 0 || modifiedItems.length > 0;
  const hasAnyChanges = scalarChanges.length > 0 || hasItemChanges;

  if (!hasAnyChanges) return null;

  return (
    <div className="mb-4 border border-amber-300 rounded-lg overflow-hidden bg-amber-50/50">
      <div className="px-4 py-3 bg-amber-100 border-b border-amber-300 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <span className="text-sm font-bold text-amber-900">Cambios realizados por el Aprobador</span>
        {approverName && (
          <span className="ml-auto text-xs text-amber-700 font-medium">
            Por <span className="font-bold">{approverName}</span>
            {approverAt && ` el ${new Date(approverAt).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}`}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Scalar field changes */}
        {scalarChanges.length > 0 && (
          <div className="space-y-1.5">
            {scalarChanges.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="font-bold text-gray-600 min-w-[140px]">{c.label}:</span>
                <span className="text-red-600 line-through">{c.oldVal}</span>
                <span className="text-gray-400">→</span>
                <span className="text-emerald-700 font-medium">{c.newVal}</span>
              </div>
            ))}
          </div>
        )}

        {/* Item changes */}
        {hasItemChanges && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-600">Items:</span>

            {/* Added items */}
            {addedItems.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-700">Agregados ({addedItems.length})</span>
                {addedItems.map((item) => (
                  <div key={item.id} className="text-xs px-2 py-1 bg-emerald-50 border border-emerald-200 rounded">
                    <span className="font-medium">{item.cant} {item.unidad || "und"}</span>
                    {" — "}
                    <span className="uppercase">{item.descripcion}</span>
                    <span className="ml-2 font-bold text-emerald-700">${item.total?.toFixed(2) || "0.00"}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Removed items */}
            {removedItems.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-red-700">Eliminados ({removedItems.length})</span>
                {removedItems.map((item) => (
                  <div key={item.id} className="text-xs px-2 py-1 bg-red-50 border border-red-200 rounded line-through text-gray-500">
                    <span className="font-medium">{item.cant} {item.unidad || "und"}</span>
                    {" — "}
                    <span className="uppercase">{item.descripcion}</span>
                    <span className="ml-2 font-bold">${item.total?.toFixed(2) || "0.00"}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Modified items */}
            {modifiedItems.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-700">Modificados ({modifiedItems.length})</span>
                {modifiedItems.map(({ newItem, changes }) => (
                  <div key={newItem.id} className="text-xs px-2 py-1.5 bg-amber-50 border border-amber-200 rounded space-y-0.5">
                    <div className="font-medium uppercase">{newItem.descripcion}</div>
                    {changes.map((ch, i) => (
                      <div key={i} className="text-amber-800 pl-2">{ch}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
