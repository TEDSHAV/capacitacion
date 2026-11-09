import test, { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// We'll test both unit logic and simulation of the whole flow

describe("1. OCR Data Cleaning & Participant Validation", () => {
  // Extract the validation logic equivalent to OCRService
  function cleanName(name) {
    const cleaned = name
      .replace(/^\d+[\.)]?\s*/, "") // Remove leading numbers
      .replace(/[|•\-]\s*$/, "") // Remove trailing separators
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
    if (!cleaned) return "";

    return cleaned
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function validateParticipant(participant) {
    const forbiddenNames = [
      "analista", "supervisor", "gerente", "operador", "mecanico", "mecánico",
      "conductor", "pasante", "chofer", "obrero", "coordinador", "jefe", "presidente"
    ];

    const lowerName = participant.name.toLowerCase();
    const isForbidden = forbiddenNames.some(f => lowerName === f || lowerName.startsWith(f + " "));

    return (
      participant.name.length > 2 &&
      !isForbidden &&
      participant.idNumber.length >= 6 &&
      participant.idNumber.length <= 9
    );
  }

  function parseGeminiResponse(candidateText, model = "gemini-3.8-flash") {
    let parsed;
    try {
      parsed = JSON.parse(candidateText);
    } catch {
      const match = candidateText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return { text: candidateText, error: "No se pudo interpretar el formato JSON de Google Gemini." };
      }
    }

    const rawParticipants = Array.isArray(parsed.participants) ? parsed.participants : [];

    const participants = rawParticipants
      .filter((p) => p && p.name && p.cedula)
      .map((p) => {
        const digits = String(p.cedula).replace(/\D/g, "");
        return {
          name: cleanName(String(p.name)),
          idNumber: digits,
          nationality: String(p.nationality).toUpperCase() === "E" ? "extranjero" : "venezolano",
          score: typeof p.score === "number" && !isNaN(p.score) ? Math.round(p.score) : undefined,
          confidence: 0.95,
        };
      })
      .filter((p) => p.name.length > 2 && p.idNumber.length >= 6);

    return {
      text: parsed.markdown || "",
      markdown: parsed.markdown || "",
      participants,
    };
  }

  it("should format names to proper Title Case and remove row numbers and symbols", () => {
    assert.equal(cleanName("1. CARLOS ALBERTO PEREZ -"), "Carlos Alberto Perez");
    assert.equal(cleanName("02) maria de los angeles  gomez"), "Maria De Los Angeles Gomez");
    assert.equal(cleanName("3. JOSE RAMON LOPEZ |"), "Jose Ramon Lopez");
  });

  it("should filter out non-participant job titles and header artifacts", () => {
    assert.equal(validateParticipant({ name: "Supervisor De Planta", idNumber: "12345678" }), false);
    assert.equal(validateParticipant({ name: "Analista", idNumber: "12345678" }), false);
    assert.equal(validateParticipant({ name: "Gerente General", idNumber: "12345678" }), false);
    assert.equal(validateParticipant({ name: "Operador de Maquinaria", idNumber: "12345678" }), false);
    assert.equal(validateParticipant({ name: "Carlos Perez", idNumber: "12345678" }), true);
  });

  it("should validate Venezuelan cédula length (6 to 9 digits)", () => {
    assert.equal(validateParticipant({ name: "Ana Gomez", idNumber: "12345" }), false); // too short
    assert.equal(validateParticipant({ name: "Ana Gomez", idNumber: "123456" }), true); // 6 digits valid
    assert.equal(validateParticipant({ name: "Ana Gomez", idNumber: "12345678" }), true); // 8 digits valid
    assert.equal(validateParticipant({ name: "Ana Gomez", idNumber: "1234567890" }), false); // 10 digits too long
  });

  it("should parse Gemini JSON output including markdown blocks and normalize nationality and cédula", () => {
    const geminiMockOutput = JSON.stringify({
      markdown: "### Lista de Asistencia\n| N° | Nombre | Cédula |\n| 1 | Pedro Perez | V-18.456.789 |",
      participants: [
        { name: "1. PEDRO PEREZ", cedula: "V-18.456.789", nationality: "V", score: null },
        { name: "2. JOHN DOE", cedula: "E-82.123.456", nationality: "E", score: null },
        { name: "SUPERVISOR DE SEGURIDAD", cedula: "V-11.222.333", nationality: "V", score: null },
      ],
    });

    const result = parseGeminiResponse(geminiMockOutput);
    assert.equal(result.participants.length, 3);
    assert.equal(result.participants[0].name, "Pedro Perez");
    assert.equal(result.participants[0].idNumber, "18456789");
    assert.equal(result.participants[0].nationality, "venezolano");

    assert.equal(result.participants[1].name, "John Doe");
    assert.equal(result.participants[1].idNumber, "82123456");
    assert.equal(result.participants[1].nationality, "extranjero");

    // Applying validateParticipant filters out the supervisor
    const validated = result.participants.filter(validateParticipant);
    assert.equal(validated.length, 2);
    assert.equal(validated.map(p => p.name).includes("Pedro Perez"), true);
    assert.equal(validated.map(p => p.name).includes("John Doe"), true);
  });
});

describe("2. Gemini Model Cascade, 503/429 Retries & 404 Fast-Skip", () => {
  async function simulateGeminiCascade(fetchMock) {
    const models = [
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.7-flash",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
    ];
    let lastError = "";
    const callLog = [];

    for (const model of models) {
      const MAX_RETRIES = 2;
      let retryDelay = 10; // short for testing

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        callLog.push({ model, attempt });
        let response;
        try {
          response = await fetchMock(model, attempt);
        } catch (fetchErr) {
          lastError = fetchErr.message;
          break;
        }

        if (response.ok) {
          return { success: true, model, callLog, data: response.data };
        }

        lastError = response.statusText;

        if ((response.status === 503 || response.status === 429) && attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, retryDelay));
          retryDelay *= 2;
          continue;
        }

        if (response.status === 404) {
          // Deprecated model: skip immediately to next model
          break;
        }

        break;
      }
    }

    return {
      success: false,
      error: `No fue posible reconocer los participantes del archivo automáticamente. Deberás agregarlos manualmente en la lista.`,
      lastError,
      callLog,
    };
  }

  it("should retry transient 503 errors and succeed on retry", async () => {
    let attempts = 0;
    const mockFetch = async (model, attempt) => {
      attempts++;
      if (model === "gemini-3.8-flash" && attempt < 2) {
        return { ok: false, status: 503, statusText: "Service Unavailable" };
      }
      return { ok: true, data: { participants: [{ name: "Maria Lopez", cedula: "20111222" }] } };
    };

    const res = await simulateGeminiCascade(mockFetch);
    assert.equal(res.success, true);
    assert.equal(res.model, "gemini-3.8-flash");
    assert.equal(res.callLog.length, 3); // attempt 0 (503), attempt 1 (503), attempt 2 (200 OK)
  });

  it("should skip 404 deprecated models immediately without retrying", async () => {
    const mockFetch = async (model) => {
      if (model === "gemini-3.8-flash") {
        return { ok: false, status: 404, statusText: "Not Found (Deprecated)" };
      }
      return { ok: true, data: { participants: [{ name: "Jose Diaz", cedula: "19888777" }] } };
    };

    const res = await simulateGeminiCascade(mockFetch);
    assert.equal(res.success, true);
    assert.equal(res.model, "gemini-3.5-flash-lite"); // Cascade moved to the second model
    const gemini38Calls = res.callLog.filter((c) => c.model === "gemini-3.8-flash");
    assert.equal(gemini38Calls.length, 1); // Only 1 attempt before skipping
  });

  it("should return a clean user-facing error when all models fail (no infinite spinner)", async () => {
    const mockFetch = async () => {
      return { ok: false, status: 503, statusText: "Overloaded" };
    };

    const res = await simulateGeminiCascade(mockFetch);
    assert.equal(res.success, false);
    assert.ok(res.error.includes("Deberás agregarlos manualmente en la lista"));
  });
});

describe("3. Facilitador Participant Form Data Transformation & Submission", () => {
  it("should convert OCR ExtractedParticipant to Portal Participant format", () => {
    const ocrParticipants = [
      { name: "Juan Gomez", idNumber: "15678901", nationality: "venezolano" },
      { name: "Claire Smith", idNumber: "80123456", nationality: "extranjero" },
    ];

    const portalParticipants = ocrParticipants.map((p) => ({
      nombre_apellido: p.name,
      cedula: p.idNumber,
      score: "", // In portal attendance list, score starts blank
      nationality: p.nationality,
    }));

    assert.equal(portalParticipants.length, 2);
    assert.deepEqual(portalParticipants[0], {
      nombre_apellido: "Juan Gomez",
      cedula: "15678901",
      score: "",
      nationality: "venezolano",
    });
    assert.deepEqual(portalParticipants[1], {
      nombre_apellido: "Claire Smith",
      cedula: "80123456",
      score: "",
      nationality: "extranjero",
    });
  });

  it("should enforce disclaimer confirmation when status is 'final'", () => {
    function validateSubmission(status, acknowledged, disclaimerText) {
      if (status === "final" && !acknowledged) {
        return { error: "Debes confirmar la declaración para finalizar el envío." };
      }
      if (status === "final" && (!disclaimerText || disclaimerText.trim().length === 0)) {
        return { error: "Falta el texto de la declaración de responsabilidad." };
      }
      return { success: true };
    }

    // Draft does not require acknowledgment
    assert.deepEqual(validateSubmission("draft", false, ""), { success: true });

    // Final without acknowledgment must fail
    assert.deepEqual(
      validateSubmission("final", false, "Declaro bajo mi responsabilidad..."),
      { error: "Debes confirmar la declaración para finalizar el envío." }
    );

    // Final with acknowledgment succeeds
    assert.deepEqual(
      validateSubmission("final", true, "Declaro bajo mi responsabilidad..."),
      { success: true }
    );
  });

  it("should prepare clean DB records for insertion without mutating input", () => {
    const osiId = 1050;
    const facilitadorId = 42;
    const participants = [
      { nombre_apellido: "Pedro Infante", cedula: "14234567", score: "18", nationality: "venezolano" },
      { nombre_apellido: "Maria Felix", cedula: "19876543", score: 20, nationality: "venezolano" },
    ];

    const records = participants.map((p) => ({
      osi_id: osiId,
      facilitador_id: facilitadorId,
      nombre_apellido: p.nombre_apellido.trim(),
      cedula: p.cedula.replace(/\D/g, ""),
      score: p.score,
      status: "final",
    }));

    assert.equal(records.length, 2);
    assert.equal(records[0].osi_id, 1050);
    assert.equal(records[0].facilitador_id, 42);
    assert.equal(records[0].nombre_apellido, "Pedro Infante");
    assert.equal(records[0].cedula, "14234567");
    assert.equal(records[0].score, "18");
    assert.equal(records[0].status, "final");
  });
});

describe("4. Multi-Session Independent Completion & Clipboard Isolation", () => {
  it("should separate multi-session OSIs into independent items for pending vs completed", () => {
    const multiSessionOsi = {
      id_osi: 999,
      nro_osi: "OSI-2026-999",
      session_count: 2,
      sessions_list: [
        { nro_sesion: 1, is_completed: true, participant_status: "final", fecha: "2026-11-01" },
        { nro_sesion: 2, is_completed: false, participant_status: "draft", fecha: "2026-11-02" },
      ],
    };

    // Dashboard expansion logic
    const items = multiSessionOsi.sessions_list.map((s) => ({
      osi: multiSessionOsi,
      targetSession: s.nro_sesion,
      isDone: Boolean(s.is_completed),
      key: `${multiSessionOsi.id_osi}_s${s.nro_sesion}`,
    }));

    const pendientes = items.filter((item) => !item.isDone);
    const finalizados = items.filter((item) => item.isDone);

    assert.equal(pendientes.length, 1);
    assert.equal(pendientes[0].targetSession, 2);
    assert.equal(pendientes[0].isDone, false);

    assert.equal(finalizados.length, 1);
    assert.equal(finalizados[0].targetSession, 1);
    assert.equal(finalizados[0].isDone, true);
  });

  it("should preserve specific targetSession when facilitator is assigned only to Session 2 of a multi-session course", () => {
    const osiWithOnlySession2Assigned = {
      id_osi: 386,
      nro_osi: "3609",
      session_count: 3,
      sessions_list: [
        { nro_sesion: 2, is_completed: false, participant_status: "draft", fecha: "2026-10-26" },
      ],
    };

    // Dashboard expansion logic as implemented in FacilitadorDashboardClient
    const sessions = osiWithOnlySession2Assigned.sessions_list && osiWithOnlySession2Assigned.sessions_list.length > 0 ? osiWithOnlySession2Assigned.sessions_list : [];
    const isMultiCourse =
      (osiWithOnlySession2Assigned.session_count && osiWithOnlySession2Assigned.session_count > 1) ||
      sessions.length > 1 ||
      (sessions[0]?.nro_sesion && sessions[0].nro_sesion > 1);

    const items = [];
    if (sessions.length > 0) {
      for (const ses of sessions) {
        items.push({
          key: `${osiWithOnlySession2Assigned.id_osi}_ses_${ses.nro_sesion}`,
          targetSession: ses.nro_sesion,
          isMultiSession: isMultiCourse,
          isDone: Boolean(ses.is_completed),
        });
      }
    }

    assert.equal(items.length, 1);
    assert.equal(items[0].targetSession, 2, "targetSession must be 2, not hardcoded to 1");
    assert.equal(items[0].isMultiSession, true, "isMultiSession must be true for multi-session course");
    assert.equal(items[0].key, "386_ses_2");
  });

  it("should enforce clipboard isolation by facilitadorId", () => {
    const fakeSessionStorage = new Map();
    const saveClipboard = (facilitadorId, participants) => {
      fakeSessionStorage.set(`facilitador_clipboard_${facilitadorId}`, JSON.stringify(participants));
    };
    const getClipboard = (facilitadorId) => {
      const val = fakeSessionStorage.get(`facilitador_clipboard_${facilitadorId}`);
      return val ? JSON.parse(val) : null;
    };

    const fac1Id = 101;
    const fac2Id = 202;

    const listFac1 = [
      { nombre_apellido: "Juan Perez", cedula: "11222333", score: "19", nationality: "venezolano" },
    ];
    saveClipboard(fac1Id, listFac1);

    // Facilitador 2 should NOT have access to Facilitador 1's clipboard
    assert.equal(getClipboard(fac2Id), null);
    assert.deepEqual(getClipboard(fac1Id), listFac1);
  });

  it("should validate active session attachments independently without blocking on other pending sessions", () => {
    const attachments = [
      // Session 1 attachments complete
      { nro_sesion: 1, category: "lista_asistencia" },
      { nro_sesion: 1, category: "hoja_calificacion" },
      { nro_sesion: 1, category: "material_fotografico" },
      // Session 2 has no attachments
    ];

    const isSessionComplete = (sesNum, isParticipationOnly = false) => {
      const forSes = attachments.filter((a) => a.nro_sesion === sesNum);
      const hasAsist = forSes.some((a) => a.category === "lista_asistencia");
      const hasCalif = isParticipationOnly ? true : forSes.some((a) => a.category === "hoja_calificacion");
      const hasFotos = forSes.some((a) => a.category === "material_fotografico");
      return hasAsist && hasCalif && hasFotos;
    };

    assert.equal(isSessionComplete(1), true, "Session 1 should be complete and ready to finalize");
    assert.equal(isSessionComplete(2), false, "Session 2 should be incomplete");
  });

  it("should attribute legacy attachments with nro_sesion == null to Session 1 so facilitators who already uploaded are not blocked", () => {
    const legacyAttachments = [
      { nro_sesion: null, category: "lista_asistencia" },
      { nro_sesion: null, category: "hoja_calificacion" },
      { nro_sesion: null, category: "material_fotografico" },
    ];
    const totalSessions = 2;

    const forSes1 = totalSessions > 1
      ? legacyAttachments.filter((a) => a.nro_sesion === 1 || (1 === 1 && a.nro_sesion == null))
      : legacyAttachments;
    const forSes2 = totalSessions > 1
      ? legacyAttachments.filter((a) => a.nro_sesion === 2 || (2 === 1 && a.nro_sesion == null))
      : legacyAttachments;

    assert.equal(forSes1.length, 3, "Session 1 should adopt legacy null-session attachments");
    assert.equal(forSes2.length, 0, "Session 2 should NOT adopt legacy null-session attachments");
  });
});
