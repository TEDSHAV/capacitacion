"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Clock } from "lucide-react";
import { CertificateDraft } from "./use-certificate-draft";

interface DraftRestoreBannerProps {
  draft: CertificateDraft;
  onRestore: () => void;
  onDismiss: () => void;
}

export const DraftRestoreBanner = ({
  draft,
  onRestore,
  onDismiss,
}: DraftRestoreBannerProps) => {
  const participantCount = draft.certificateData.participants?.length || 0;
  const savedDate = new Date(draft.savedAt).toLocaleString("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-0.5">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-blue-900">
              Tienes un borrador guardado para esta OSI
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {participantCount}{" "}
              {participantCount === 1
                ? "participante"
                : "participantes"}{" "}
              &middot; Guardado el {savedDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="default"
            size="sm"
            onClick={onRestore}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="gap-1.5 text-gray-600 hover:text-gray-900"
          >
            <Trash2 className="h-4 w-4" />
            Descartar
          </Button>
        </div>
      </div>
    </div>
  );
};
