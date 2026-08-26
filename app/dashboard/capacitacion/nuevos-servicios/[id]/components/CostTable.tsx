"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CostoItem } from "@/types/diseno-servicio";

export default function CostTable({
  items,
  onChange,
}: {
  items: CostoItem[];
  onChange: (items: CostoItem[]) => void;
}) {
  const addRow = () => {
    const newItem: CostoItem = {
      id: Math.random().toString(36).substr(2, 9),
      descripcion: "",
      cantidad: 1,
      unidad: "UND",
      precio_unitario: 0,
      total: 0,
    };
    onChange([...items, newItem]);
  };

  const removeRow = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const updateRow = (id: string, updates: Partial<CostoItem>) => {
    onChange(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          updated.total = updated.cantidad * updated.precio_unitario;
          return updated;
        }
        return item;
      })
    );
  };

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Descripción</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">Cantidad</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 w-24">Unidad</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 w-32">Precio Unit.</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 w-32">Total</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                  No hay items. Click &quot;Agregar&quot; para añadir uno.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">
                    <Input
                      value={item.descripcion}
                      onChange={(e) => updateRow(item.id, { descripcion: e.target.value })}
                      className="h-8"
                      placeholder="Recurso / Material"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => updateRow(item.id, { cantidad: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-center"
                      min={0}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={item.unidad}
                      onChange={(e) => updateRow(item.id, { unidad: e.target.value })}
                      className="h-8 text-center"
                      placeholder="UND"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={item.precio_unitario}
                      onChange={(e) => updateRow(item.id, { precio_unitario: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-center"
                      min={0}
                      step="0.01"
                    />
                  </td>
                  <td className="px-3 py-2 text-center font-medium text-gray-900">
                    ${item.total.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-semibold text-gray-700">
                  Total General:
                </td>
                <td className="px-3 py-2 text-center font-bold text-gray-900">
                  ${grandTotal.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Button type="button" onClick={addRow} variant="outline" size="sm" className="flex gap-2">
        <Plus className="h-4 w-4" />
        Agregar Item
      </Button>
    </div>
  );
}
