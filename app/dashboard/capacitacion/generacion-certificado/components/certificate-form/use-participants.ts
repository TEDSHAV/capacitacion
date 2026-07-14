import { useState, useCallback, useEffect, useRef } from "react";
import { CertificateParticipant } from "@/types";
import { getParticipantByCedula } from "@/app/actions/participants";

const initialParticipant = {
  name: "",
  idNumber: "",
  score: 0,
  nationality: "venezolano" as "venezolano" | "extranjero",
  dbId: undefined as number | undefined,
  dbOriginalName: undefined as string | undefined,
  dbOriginalIdNumber: undefined as string | undefined,
};

export const useParticipants = (
  onParticipantsChange: (participants: CertificateParticipant[]) => void,
  initialParticipants: CertificateParticipant[] = [],
) => {
  const [newParticipant, setNewParticipant] = useState(initialParticipant);
  const [currentParticipants, setCurrentParticipants] =
    useState<CertificateParticipant[]>(initialParticipants);
  const [error, setError] = useState<string>("");
  const [nameAutoFilled, setNameAutoFilled] = useState(false);
  const userEditedNameRef = useRef(false);

  // Sync with parent component when initial participants change
  useEffect(() => {
    setCurrentParticipants(initialParticipants || []);
  }, [initialParticipants]);

  // Debounced auto-fill name from DB when idNumber changes
  useEffect(() => {
    const idNumberTrimmed = newParticipant.idNumber.trim();
    if (!idNumberTrimmed) {
      setNameAutoFilled(false);
      userEditedNameRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      const result = await getParticipantByCedula(
        idNumberTrimmed,
        newParticipant.nationality,
      );

      if (result.participant) {
        const dbParticipant = result.participant;
        if (!userEditedNameRef.current) {
          setNewParticipant((prev) => ({
            ...prev,
            name: dbParticipant.nombre,
            dbId: dbParticipant.id,
            dbOriginalName: dbParticipant.nombre,
            dbOriginalIdNumber: dbParticipant.cedula,
          }));
          setNameAutoFilled(true);
        }
      } else {
        setNewParticipant((prev) => ({
          ...prev,
          dbId: undefined,
          dbOriginalName: undefined,
          dbOriginalIdNumber: undefined,
        }));
        setNameAutoFilled(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newParticipant.idNumber, newParticipant.nationality]);

  const addParticipant = useCallback((): boolean => {
    if (newParticipant.name.trim() && newParticipant.idNumber.trim()) {
      // Validate score range
      const score =
        typeof newParticipant.score === "string"
          ? parseInt(newParticipant.score) || 0
          : newParticipant.score || 0;

      if (score < 0 || score > 20) {
        setError("La calificación debe estar entre 0 y 20");
        return false;
      }

      // Check if participant with same ID number already exists (regardless of name)
      const existingParticipant = currentParticipants.find(
        (p) => p.idNumber === newParticipant.idNumber.trim(),
      );

      if (existingParticipant) {
        setError(
          "Ya existe un participante con este número de cédula/pasaporte",
        );
        return false;
      }

      const participant: CertificateParticipant = {
        id: Date.now().toString(),
        name: newParticipant.name.trim(),
        idNumber: newParticipant.idNumber.trim(),
        score: score,
        nationality: newParticipant.nationality || "venezolano",
        dbId: newParticipant.dbId,
        dbOriginalName: newParticipant.dbOriginalName,
        dbOriginalIdNumber: newParticipant.dbOriginalIdNumber,
      };
      const updatedParticipants = [...currentParticipants, participant];
      setCurrentParticipants(updatedParticipants);
      onParticipantsChange(updatedParticipants);
      setNewParticipant(initialParticipant);
      userEditedNameRef.current = false;
      setNameAutoFilled(false);
      return true;
    }
    return false;
  }, [newParticipant, currentParticipants, onParticipantsChange]);

  const removeParticipant = useCallback(
    (id: string) => {
      const updatedParticipants = currentParticipants.filter(
        (p) => p.id !== id,
      );
      setCurrentParticipants(updatedParticipants);
      onParticipantsChange(updatedParticipants);
    },
    [currentParticipants, onParticipantsChange],
  );

  const updateNewParticipant = useCallback(
    (field: keyof typeof newParticipant, value: string | number) => {
      // Clear error when user starts typing
      setError("");
      if (field === "name") {
        userEditedNameRef.current = true;
        setNameAutoFilled(false);
      }
      if (field === "idNumber") {
        userEditedNameRef.current = false;
        setNameAutoFilled(false);
      }
      setNewParticipant((prev) => {
        return { ...prev, [field]: value };
      });
    },
    [],
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addParticipant();
      }
    },
    [addParticipant],
  );

  return {
    newParticipant,
    addParticipant,
    removeParticipant,
    updateNewParticipant,
    handleKeyPress,
    error,
    nameAutoFilled,
  };
};
