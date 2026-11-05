import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Batch Client Selection for Certificates & Multi-Batch Support", () => {
  // Mock OSI data as returned by v_osi_formato_completo
  const baseOsi = {
    id: "100",
    nro_osi: "2026-00100",
    tipo_servicio: "Capacitacion",
    cliente_nombre_empresa: "Constructora General, C.A.",
    empresa_id: 10,
    curso_nombre: "Seguridad y Salud Laboral",
    id_curso: 5,
    has_certificates: true, // Already has Batch 1 generated
  };

  const catalogCompanies = [
    { id: 10, razon_social: "Constructora General, C.A.", rif: "J-10000001-0" },
    { id: 25, razon_social: "Subcontratista Andamios Express, S.A.", rif: "J-20000002-0" },
    { id: 42, razon_social: "Servicios Petroleros del Lago, C.A.", rif: "J-30000003-0" },
  ];

  describe("1. OSI Selection & Default State", () => {
    it("should preserve original company info and default is_company_override to false", () => {
      const osiWithOriginals = {
        ...baseOsi,
        original_empresa_id: baseOsi.original_empresa_id ?? baseOsi.empresa_id,
        original_cliente_nombre_empresa:
          baseOsi.original_cliente_nombre_empresa ?? baseOsi.cliente_nombre_empresa,
        is_company_override: false,
      };

      assert.equal(osiWithOriginals.empresa_id, 10);
      assert.equal(osiWithOriginals.cliente_nombre_empresa, "Constructora General, C.A.");
      assert.equal(osiWithOriginals.original_empresa_id, 10);
      assert.equal(osiWithOriginals.original_cliente_nombre_empresa, "Constructora General, C.A.");
      assert.equal(osiWithOriginals.is_company_override, false);
    });
  });

  describe("2. Batch Client Override & Reset Logic", () => {
    function applyCompanyChange(selectedOSI, companyId, companyName) {
      const origId = selectedOSI.original_empresa_id ?? selectedOSI.empresa_id;
      const origName =
        selectedOSI.original_cliente_nombre_empresa ??
        selectedOSI.cliente_nombre_empresa;
      const isOverride =
        (companyId !== null && companyId !== origId) ||
        companyName.trim().toLowerCase() !== origName.trim().toLowerCase();

      return {
        ...selectedOSI,
        original_empresa_id: origId,
        original_cliente_nombre_empresa: origName,
        empresa_id: companyId ?? 0,
        cliente_nombre_empresa: companyName,
        is_company_override: isOverride,
      };
    }

    it("should update company for new batch and mark is_company_override as true", () => {
      const initialOSI = {
        ...baseOsi,
        original_empresa_id: baseOsi.empresa_id,
        original_cliente_nombre_empresa: baseOsi.cliente_nombre_empresa,
        is_company_override: false,
      };

      // Select Subcontratista Andamios Express (id: 25) for Batch 2
      const batch2OSI = applyCompanyChange(
        initialOSI,
        25,
        "Subcontratista Andamios Express, S.A."
      );

      assert.equal(batch2OSI.empresa_id, 25);
      assert.equal(batch2OSI.cliente_nombre_empresa, "Subcontratista Andamios Express, S.A.");
      assert.equal(batch2OSI.original_empresa_id, 10);
      assert.equal(batch2OSI.original_cliente_nombre_empresa, "Constructora General, C.A.");
      assert.equal(batch2OSI.is_company_override, true);
    });

    it("should allow manual custom company name when company is not in catalog", () => {
      const initialOSI = {
        ...baseOsi,
        original_empresa_id: baseOsi.empresa_id,
        original_cliente_nombre_empresa: baseOsi.cliente_nombre_empresa,
        is_company_override: false,
      };

      const customBatchOSI = applyCompanyChange(
        initialOSI,
        null,
        "Consorcio de Prueba Nuevo, C.A."
      );

      assert.equal(customBatchOSI.empresa_id, 0);
      assert.equal(customBatchOSI.cliente_nombre_empresa, "Consorcio de Prueba Nuevo, C.A.");
      assert.equal(customBatchOSI.is_company_override, true);
    });

    it("should revert back cleanly when user clicks restore to OSI client", () => {
      const initialOSI = {
        ...baseOsi,
        original_empresa_id: baseOsi.empresa_id,
        original_cliente_nombre_empresa: baseOsi.cliente_nombre_empresa,
        is_company_override: false,
      };

      const modifiedOSI = applyCompanyChange(
        initialOSI,
        42,
        "Servicios Petroleros del Lago, C.A."
      );
      assert.equal(modifiedOSI.is_company_override, true);

      // Revert to original
      const restoredOSI = applyCompanyChange(
        modifiedOSI,
        modifiedOSI.original_empresa_id,
        modifiedOSI.original_cliente_nombre_empresa
      );

      assert.equal(restoredOSI.empresa_id, 10);
      assert.equal(restoredOSI.cliente_nombre_empresa, "Constructora General, C.A.");
      assert.equal(restoredOSI.is_company_override, false);
    });
  });

  describe("3. Server Fallback Protection in saveCertificatesToDatabase", () => {
    // Simulation of saveCertificatesToDatabase fallback block
    function simulateServerOsiResolution(osiData, osiMatch) {
      const resolved = { ...osiData };
      if (!resolved.id_sede && osiMatch.id_sede) {
        resolved.id_sede = osiMatch.id_sede;
      }
      if (!resolved.id_ciudad && osiMatch.id_ciudad) {
        resolved.id_ciudad = osiMatch.id_ciudad;
      }
      // Critical check under test:
      if (!resolved.is_company_override && !resolved.empresa_id && osiMatch.id_empresa) {
        resolved.empresa_id = osiMatch.id_empresa;
      }
      return resolved;
    }

    it("should resolve missing empresa_id from database when NOT an intentional override", () => {
      const regularOSI = {
        nro_osi: "2026-00100",
        empresa_id: null,
        is_company_override: false,
      };
      const dbMatch = { id_empresa: 10, id_ciudad: 3 };
      const result = simulateServerOsiResolution(regularOSI, dbMatch);

      assert.equal(result.empresa_id, 10, "Should populate empresa_id from DB match when not an override");
    });

    it("should NOT overwrite empresa_id when is_company_override is true", () => {
      const overriddenBatchOSI = {
        nro_osi: "2026-00100",
        empresa_id: 25, // Client B
        is_company_override: true,
      };
      const dbMatch = { id_empresa: 10, id_ciudad: 3 }; // OSI's default is Client A (10)
      const result = simulateServerOsiResolution(overriddenBatchOSI, dbMatch);

      assert.equal(result.empresa_id, 25, "Must keep the batch-selected company ID and not overwrite with OSI's company");
    });

    it("should NOT overwrite manual company (empresa_id: 0) when is_company_override is true", () => {
      const manualBatchOSI = {
        nro_osi: "2026-00100",
        empresa_id: 0,
        cliente_nombre_empresa: "Empresa Manual No Registrada",
        is_company_override: true,
      };
      const dbMatch = { id_empresa: 10, id_ciudad: 3 };
      const result = simulateServerOsiResolution(manualBatchOSI, dbMatch);

      assert.equal(result.empresa_id, 0, "Must not overwrite manual company with OSI default");
    });
  });

  describe("4. Multi-Batch Snapshots & Document Isolation", () => {
    function createBatchRecords(osiData, participants) {
      return participants.map((p, index) => ({
        id: index + 1,
        id_empresa: osiData.empresa_id,
        nro_osi: parseInt(osiData.nro_osi.replace(/[^\d]/g, "")),
        calificacion: p.score,
        snapshot_contenido: JSON.stringify({
          certificado: {
            id_empresa: osiData.empresa_id,
            nro_osi: osiData.nro_osi,
          },
          participante: {
            name: p.name,
            cedula: p.idNumber,
          },
          osi: {
            cliente_nombre_empresa: osiData.cliente_nombre_empresa,
            empresa_id: osiData.empresa_id,
            nro_osi: osiData.nro_osi,
          },
        }),
      }));
    }

    it("should generate Batch 1 for Client A and Batch 2 for Client B under the same OSI without conflict", () => {
      // Batch 1 (Client A)
      const batch1OSI = {
        ...baseOsi,
        empresa_id: 10,
        cliente_nombre_empresa: "Constructora General, C.A.",
      };
      const batch1Participants = [
        { name: "Juan Perez", idNumber: "12345678", score: 18 },
        { name: "Maria Rodriguez", idNumber: "23456789", score: 19 },
      ];
      const batch1Certs = createBatchRecords(batch1OSI, batch1Participants);

      // Batch 2 (Client B under same OSI)
      const batch2OSI = {
        ...baseOsi,
        empresa_id: 25,
        cliente_nombre_empresa: "Subcontratista Andamios Express, S.A.",
        is_company_override: true,
      };
      const batch2Participants = [
        { name: "Carlos Sanchez", idNumber: "34567890", score: 16 },
        { name: "Ana Gomez", idNumber: "45678901", score: 17 },
      ];
      const batch2Certs = createBatchRecords(batch2OSI, batch2Participants);

      // Verify Batch 1 certificates
      for (const cert of batch1Certs) {
        assert.equal(cert.id_empresa, 10);
        assert.equal(cert.nro_osi, 202600100);
        const snap = JSON.parse(cert.snapshot_contenido);
        assert.equal(snap.osi.cliente_nombre_empresa, "Constructora General, C.A.");
        assert.equal(snap.osi.empresa_id, 10);
      }

      // Verify Batch 2 certificates
      for (const cert of batch2Certs) {
        assert.equal(cert.id_empresa, 25);
        assert.equal(cert.nro_osi, 202600100);
        const snap = JSON.parse(cert.snapshot_contenido);
        assert.equal(snap.osi.cliente_nombre_empresa, "Subcontratista Andamios Express, S.A.");
        assert.equal(snap.osi.empresa_id, 25);
      }

      // Verify generated ZIP filenames are distinct and properly reflect the batch's client
      const zipName1 = `Documentos_OSI_${batch1OSI.nro_osi}_${batch1OSI.cliente_nombre_empresa.replace(/[^a-zA-Z0-9-_]/g, "_")}_Curso.zip`;
      const zipName2 = `Documentos_OSI_${batch2OSI.nro_osi}_${batch2OSI.cliente_nombre_empresa.replace(/[^a-zA-Z0-9-_]/g, "_")}_Curso.zip`;

      assert.ok(zipName1.includes("Constructora_General__C_A_"));
      assert.ok(zipName2.includes("Subcontratista_Andamios_Express__S_A_"));
      assert.notEqual(zipName1, zipName2);
    });
  });

  describe("5. Client Portal Data Isolation", () => {
    it("should isolate certificates by id_empresa so each client only sees their corresponding batch", () => {
      const allCertsInDb = [
        // Batch 1 (Client A)
        { id: 1, nro_osi: 202600100, id_empresa: 10, participant: "Juan Perez" },
        { id: 2, nro_osi: 202600100, id_empresa: 10, participant: "Maria Rodriguez" },
        // Batch 2 (Client B under same OSI)
        { id: 3, nro_osi: 202600100, id_empresa: 25, participant: "Carlos Sanchez" },
        { id: 4, nro_osi: 202600100, id_empresa: 25, participant: "Ana Gomez" },
      ];

      // Simulated Client Portal query: .eq("id_empresa", sessionEmpresaId)
      const queryClientPortal = (empresaId) =>
        allCertsInDb.filter((c) => c.id_empresa === empresaId);

      // Client A logs in
      const clientAPortalCerts = queryClientPortal(10);
      assert.equal(clientAPortalCerts.length, 2);
      assert.deepEqual(
        clientAPortalCerts.map((c) => c.participant),
        ["Juan Perez", "Maria Rodriguez"]
      );

      // Client B logs in
      const clientBPortalCerts = queryClientPortal(25);
      assert.equal(clientBPortalCerts.length, 2);
      assert.deepEqual(
        clientBPortalCerts.map((c) => c.participant),
        ["Carlos Sanchez", "Ana Gomez"]
      );

      // Neither client sees the other's participants
      assert.ok(clientAPortalCerts.every((c) => c.id_empresa === 10));
      assert.ok(clientBPortalCerts.every((c) => c.id_empresa === 25));
    });
  });

  describe("6. Batch Partitioning in gestion-osi (OSIDetailsModalV2)", () => {
    it("should partition batches by course, date, and client company so multiple batches under the same OSI/course are separated", () => {
      const mockCerts = [
        // Batch 1: Manlift - Costa Norte (7 certs)
        ...Array.from({ length: 7 }, (_, i) => ({
          id: 5039 + i,
          fecha_emision: "2026-10-24",
          catalogo_servicios: { nombre: "SEGURIDAD EN ELEVADORES DE CARGA (MANLIFT)" },
          empresas: { razon_social: "COSTA NORTE CONSTRUCCIONES, C.A." },
          snapshot_contenido: JSON.stringify({
            osi: { cliente_nombre_empresa: "COSTA NORTE CONSTRUCCIONES, C.A." },
          }),
        })),
        // Batch 2: Trabajo en Alturas - Costa Norte (49 certs)
        ...Array.from({ length: 49 }, (_, i) => ({
          id: 5065 + i,
          fecha_emision: "2026-10-24",
          catalogo_servicios: { nombre: "TRABAJO EN ALTURAS" },
          empresas: { razon_social: "COSTA NORTE CONSTRUCCIONES, C.A." },
          snapshot_contenido: JSON.stringify({
            osi: { cliente_nombre_empresa: "COSTA NORTE CONSTRUCCIONES, C.A" },
          }),
        })),
        // Batch 3: Trabajo en Alturas - ALIVA STUMP (13 certs)
        ...Array.from({ length: 13 }, (_, i) => ({
          id: 5114 + i,
          fecha_emision: "2026-10-24",
          catalogo_servicios: { nombre: "TRABAJO EN ALTURAS" },
          empresas: { razon_social: "COSTA NORTE CONSTRUCCIONES, C.A." },
          snapshot_contenido: JSON.stringify({
            osi: { cliente_nombre_empresa: "ALIVA STUMP, C.A" },
          }),
        })),
      ];

      // Replicate grouping logic in osi-details-modal-v2.tsx
      const batchMap = new Map();
      mockCerts.forEach((cert) => {
        const snapshot = JSON.parse(cert.snapshot_contenido);
        const date = cert.fecha_emision || "Sin fecha";
        const course = cert.catalogo_servicios?.nombre || "Sin curso";
        const rawCompany =
          snapshot?.osi?.cliente_nombre_empresa ||
          cert.empresas?.razon_social ||
          "Sin empresa";
        const company = rawCompany.trim();
        const companyKey = company.toLowerCase();
        const key = `${date}_${course}_${companyKey}`;

        if (!batchMap.has(key)) {
          batchMap.set(key, {
            id: key,
            date,
            course,
            company,
            certificates: [],
          });
        }
        batchMap.get(key).certificates.push(cert);
      });

      const batches = Array.from(batchMap.values());

      // Exactly 3 batches divided properly!
      assert.equal(batches.length, 3);

      const manliftBatch = batches.find((b) => b.course.includes("MANLIFT"));
      const alturasCostaBatch = batches.find(
        (b) => b.course === "TRABAJO EN ALTURAS" && b.company.includes("COSTA NORTE")
      );
      const alturasAlivaBatch = batches.find(
        (b) => b.course === "TRABAJO EN ALTURAS" && b.company.includes("ALIVA STUMP")
      );

      assert.ok(manliftBatch);
      assert.equal(manliftBatch.certificates.length, 7);

      assert.ok(alturasCostaBatch);
      assert.equal(alturasCostaBatch.certificates.length, 49);

      assert.ok(alturasAlivaBatch);
      assert.equal(alturasAlivaBatch.certificates.length, 13);
    });
  });

  describe("7. Batch Partitioning in BatchEditModal (getOSIsWithCertificatesAction)", () => {
    it("should include company in the unique key so all distinct batches can be selected and edited", () => {
      const mockDbRows = [
        // Batch 1: Manlift - Costa Norte
        {
          nro_osi: 3637,
          id_curso: 12,
          empresas: { razon_social: "COSTA NORTE CONSTRUCCIONES, C.A." },
          catalogo_servicios: { nombre: "SEGURIDAD EN ELEVADORES DE CARGA (MANLIFT)" },
          snapshot_contenido: JSON.stringify({
            osi: { cliente_nombre_empresa: "COSTA NORTE CONSTRUCCIONES, C.A." },
          }),
        },
        // Batch 2: Trabajo en Alturas - Costa Norte
        {
          nro_osi: 3637,
          id_curso: 14,
          empresas: { razon_social: "COSTA NORTE CONSTRUCCIONES, C.A." },
          catalogo_servicios: { nombre: "TRABAJO EN ALTURAS" },
          snapshot_contenido: JSON.stringify({
            osi: { cliente_nombre_empresa: "COSTA NORTE CONSTRUCCIONES, C.A" },
          }),
        },
        // Batch 3: Trabajo en Alturas - ALIVA STUMP
        {
          nro_osi: 3637,
          id_curso: 14,
          empresas: { razon_social: "COSTA NORTE CONSTRUCCIONES, C.A." },
          catalogo_servicios: { nombre: "TRABAJO EN ALTURAS" },
          snapshot_contenido: JSON.stringify({
            osi: { cliente_nombre_empresa: "ALIVA STUMP, C.A" },
          }),
        },
      ];

      // Replicate grouping in getOSIsWithCertificatesAction
      const osiMap = new Map();
      mockDbRows.forEach((item) => {
        let snapCompanyName = null;
        if (item.snapshot_contenido) {
          const snap = JSON.parse(item.snapshot_contenido);
          snapCompanyName = snap?.osi?.cliente_nombre_empresa;
        }
        const companyName = (snapCompanyName || item.empresas?.razon_social || "S/N").trim();
        const courseName = item.catalogo_servicios?.nombre || "S/N";
        const key = `${item.nro_osi}-${item.id_curso}-${companyName.toLowerCase()}`;

        if (!osiMap.has(key)) {
          osiMap.set(key, {
            nro_osi: item.nro_osi,
            id_curso: item.id_curso,
            company_name: companyName,
            course_name: courseName,
          });
        }
      });

      const options = Array.from(osiMap.values());

      // Exactly 3 selectable batch options in BatchEditModal
      assert.equal(options.length, 3);
      assert.ok(options.some((o) => o.course_name.includes("MANLIFT") && o.company_name.includes("COSTA NORTE")));
      assert.ok(options.some((o) => o.course_name === "TRABAJO EN ALTURAS" && o.company_name.includes("COSTA NORTE")));
      assert.ok(options.some((o) => o.course_name === "TRABAJO EN ALTURAS" && o.company_name.includes("ALIVA STUMP")));
    });
  });
});

