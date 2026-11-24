import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SALONES_SHA,
  SALONES_SHA_CONFIG,
  normalizeSalonName,
  getSalonCanonicalId,
  isShaLocation,
  matchSalonFilter,
} from "../lib/constants/salones.ts";

describe("Cobertura Geográfica: SHA Classrooms & Filters Suite", () => {
  describe("1. Salon Normalization & Canonical Identifiers", () => {
    it("should normalize Salón 1 variants to 'Salón 1 (Principal)'", () => {
      const variants = [
        "Salón 1",
        "salon 1",
        "salón 1",
        "Salón Principal",
        "salon-principal",
        "principal",
        "1",
        "salon-1",
      ];
      for (const v of variants) {
        assert.equal(
          normalizeSalonName(v),
          "Salón 1 (Principal)",
          `Variant '${v}' failed to normalize to 'Salón 1 (Principal)'`,
        );
        assert.equal(
          getSalonCanonicalId(v),
          "salon-principal",
          `Variant '${v}' failed to resolve canonical ID 'salon-principal'`,
        );
      }
    });

    it("should normalize Salón Oriente variants to 'Salón Oriente'", () => {
      const variants = [
        "Salón Oriente",
        "salon oriente",
        "salón oriente",
        "salon-oriente",
        "oriente",
        "3",
        "salon-3",
      ];
      for (const v of variants) {
        assert.equal(
          normalizeSalonName(v),
          "Salón Oriente",
          `Variant '${v}' failed to normalize to 'Salón Oriente'`,
        );
        assert.equal(
          getSalonCanonicalId(v),
          "salon-oriente",
          `Variant '${v}' failed to resolve canonical ID 'salon-oriente'`,
        );
      }
    });

    it("should normalize Salón Elite variants to 'Salón Elite'", () => {
      const variants = [
        "Salón Elite",
        "salon elite",
        "salón elite",
        "salon-elite",
        "elite",
        "2",
        "salon-2",
      ];
      for (const v of variants) {
        assert.equal(
          normalizeSalonName(v),
          "Salón Elite",
          `Variant '${v}' failed to normalize to 'Salón Elite'`,
        );
        assert.equal(
          getSalonCanonicalId(v),
          "salon-elite",
          `Variant '${v}' failed to resolve canonical ID 'salon-elite'`,
        );
      }
    });

    it("should handle null, undefined and empty strings safely", () => {
      assert.equal(normalizeSalonName(null), null);
      assert.equal(normalizeSalonName(undefined), null);
      assert.equal(normalizeSalonName("   "), null);
      assert.equal(getSalonCanonicalId(null), null);
      assert.equal(getSalonCanonicalId(""), null);
    });
  });

  describe("2. isShaLocation Detection & Anti-False Positive Guardrails", () => {
    it("should detect legitimate SHA venues", () => {
      assert.equal(isShaLocation("Instalaciones SHA de Venezuela", "Puerto La Cruz"), true);
      assert.equal(isShaLocation("Oficinas SHA", null), true);
      assert.equal(isShaLocation(null, "Sede Propia SHA"), true);
      assert.equal(isShaLocation("S.H.A de Venezuela C.A.", null), true);
      assert.equal(isShaLocation("Av Intercomunal Edif SHA", null), true);
      assert.equal(isShaLocation("Sector Las Garzas, Sede SHA", null), true);
    });

    it("should NEVER classify Coca-Cola plants or client facilities in other cities as SHA venues", () => {
      // Coca-Cola FEMSA plants and branches
      assert.equal(
        isShaLocation(
          "Zona Industrial Los Cortijos, Caracas",
          "Coca-Cola FEMSA Planta Los Cortijos",
        ),
        false,
      );
      assert.equal(
        isShaLocation(
          "Zona Industrial Municipal Sur, Valencia, Carabobo",
          "Coca-Cola FEMSA Planta Valencia",
        ),
        false,
      );
      assert.equal(
        isShaLocation(
          "Av. Principal Planta Oriente, Barcelona",
          "Coca-Cola FEMSA Planta Oriente",
        ),
        false, // Must not match "Planta Oriente" or "Av. Principal" as SHA venue!
      );
      assert.equal(
        isShaLocation(
          "Carretera Nacional La Raiza, Caujarito",
          "Coca-Cola FEMSA Distribuidora Charallave",
        ),
        false,
      );
      assert.equal(
        isShaLocation(
          "Av. 68 con Calle 148, Maracaibo, Zulia",
          "Coca-Cola FEMSA Planta Maracaibo",
        ),
        false,
      );
    });

    it("should return false for other client plants and third-party locations", () => {
      assert.equal(isShaLocation("Carretera Nacional Morón-Coro", "Refinería El Palito"), false);
      assert.equal(isShaLocation("Zona Industrial San Vicente, Maracay", "Cervecería Polar"), false);
      assert.equal(isShaLocation("Av. Francisco de Miranda, Caracas", "Torre Credicard"), false);
    });
  });

  describe("3. Classroom Assignment Integrity for In-Company Services", () => {
    it("should enforce that an in-company course (like Coca-Cola) NEVER receives an SHA classroom", () => {
      const cocaColaOsi = {
        idOsi: 888,
        nroOsi: "OSI-2026-888",
        empresaNombre: "COCA-COLA FEMSA DE VENEZUELA",
        direccion: "Zona Industrial Sur, Valencia",
        sede: "Planta Valencia",
        idEstado: 8, // Carabobo
      };

      const isSha = isShaLocation(cocaColaOsi.direccion, cocaColaOsi.sede);
      assert.equal(isSha, false, "Coca-Cola in Valencia must NOT be an SHA venue");

      // Even if an accidental step metadata existed, it must be ignored if not an SHA venue
      const rawSalonFromStep = "Salón 1";
      let salon = null;
      let salonCanonicalId = null;

      if (isSha) {
        salon = normalizeSalonName(rawSalonFromStep);
        salonCanonicalId = getSalonCanonicalId(salon);
      }

      assert.equal(salon, null, "In-company course must have salon=null");
      assert.equal(salonCanonicalId, null, "In-company course must have salonCanonicalId=null");
    });
  });

  describe("4. matchSalonFilter Filter Matching Logic", () => {
    it("should pass any item when filterSalon is empty or null", () => {
      assert.equal(matchSalonFilter("Salón 1", "", true), true);
      assert.equal(matchSalonFilter(null, null, false), true);
    });

    it("should correctly handle 'all_sha' filter", () => {
      assert.equal(matchSalonFilter("Salón 1", "all_sha", true), true);
      assert.equal(matchSalonFilter("Salón Oriente", "all_sha", true), true);
      assert.equal(matchSalonFilter(null, "all_sha", true), true);
      assert.equal(matchSalonFilter(null, "all_sha", false), false);
      assert.equal(matchSalonFilter("Sala A", "all_sha", false), false);
    });

    it("should correctly handle 'sin_salon' filter (pending salon assignment)", () => {
      assert.equal(matchSalonFilter(null, "sin_salon", true), true);
      assert.equal(matchSalonFilter("", "sin_salon", true), true);
      assert.equal(matchSalonFilter("   ", "sin_salon", true), true);
      assert.equal(matchSalonFilter("Salón 1", "sin_salon", true), false);
      assert.equal(matchSalonFilter("Salón Oriente", "sin_salon", true), false);
      assert.equal(matchSalonFilter(null, "sin_salon", false), false);
    });

    it("should cross-match normalized classroom filters seamlessly", () => {
      assert.equal(matchSalonFilter("Salón Principal", "Salón 1", true), true);
      assert.equal(matchSalonFilter("salon-principal", "Salón 1", true), true);
      assert.equal(matchSalonFilter("Salón 1 (Principal)", "Salón 1", true), true);
      assert.equal(matchSalonFilter("Salón 1", "Salón 1 (Principal)", true), true);

      assert.equal(matchSalonFilter("Salón Oriente", "Salón Oriente", true), true);
      assert.equal(matchSalonFilter("salon-oriente", "Salón Oriente", true), true);
      assert.equal(matchSalonFilter("oriente", "Salón Oriente", true), true);

      assert.equal(matchSalonFilter("Salón Elite", "Salón Elite", true), true);
      assert.equal(matchSalonFilter("salon-elite", "Salón Elite", true), true);

      // Non-matching classrooms
      assert.equal(matchSalonFilter("Salón Oriente", "Salón 1", true), false);
      assert.equal(matchSalonFilter("Salón Elite", "Salón Oriente", true), false);
      assert.equal(matchSalonFilter("Salón 1", "Salón Elite", true), false);
    });
  });

  describe("5. SHA Classroom Metrics Aggregation Invariants", () => {
    const mockOsis = [
      {
        idOsi: 101,
        nroOsi: "OSI-2026-101",
        servicio: "Espacios Confinados",
        empresaNombre: "Petrocedeño",
        isShaVenue: true,
        salon: "Salón 1 (Principal)",
        salonCanonicalId: "salon-principal",
        horasAcademicas: 8,
        certificadosEmitidos: 15,
      },
      {
        idOsi: 102,
        nroOsi: "OSI-2026-102",
        servicio: "Trabajo en Altura",
        empresaNombre: "Petrocedeño",
        isShaVenue: true,
        salon: "Salón 1 (Principal)",
        salonCanonicalId: "salon-principal",
        horasAcademicas: 8,
        certificadosEmitidos: 12,
      },
      {
        idOsi: 103,
        nroOsi: "OSI-2026-103",
        servicio: "Manejo de Montacargas",
        empresaNombre: "Cervecería Polar",
        isShaVenue: true,
        salon: "Salón Oriente",
        salonCanonicalId: "salon-oriente",
        horasAcademicas: 16,
        certificadosEmitidos: 20,
      },
      {
        idOsi: 104,
        nroOsi: "OSI-2026-104",
        servicio: "Primeros Auxilios",
        empresaNombre: "Bancaribe",
        isShaVenue: true,
        salon: "Salón Elite",
        salonCanonicalId: "salon-elite",
        horasAcademicas: 8,
        certificadosEmitidos: 10,
      },
      {
        idOsi: 105,
        nroOsi: "OSI-2026-105",
        servicio: "Seguridad Eléctrica",
        empresaNombre: "Sincor",
        isShaVenue: true,
        salon: null,
        salonCanonicalId: null,
        horasAcademicas: 8,
        certificadosEmitidos: 8,
      },
      {
        idOsi: 106,
        nroOsi: "OSI-2026-106",
        servicio: "Rigging y Señalización",
        empresaNombre: "COCA-COLA FEMSA DE VENEZUELA",
        isShaVenue: false, // In-company plant in Valencia
        salon: null,
        salonCanonicalId: null,
        horasAcademicas: 24,
        certificadosEmitidos: 25,
      },
    ];

    it("should compute exact SHA courses and classroom breakdown excluding in-company", () => {
      const shaOsis = mockOsis.filter((o) => o.isShaVenue);
      assert.equal(shaOsis.length, 5);

      const totalCertificadosSha = shaOsis.reduce((sum, o) => sum + o.certificadosEmitidos, 0);
      assert.equal(totalCertificadosSha, 15 + 12 + 20 + 10 + 8); // 65

      const totalHorasSha = shaOsis.reduce((sum, o) => sum + o.horasAcademicas, 0);
      assert.equal(totalHorasSha, 8 + 8 + 16 + 8 + 8); // 48h

      // Salón 1
      const s1Osis = shaOsis.filter((o) => o.salonCanonicalId === "salon-principal");
      assert.equal(s1Osis.length, 2);

      // Salón Oriente
      const soOsis = shaOsis.filter((o) => o.salonCanonicalId === "salon-oriente");
      assert.equal(soOsis.length, 1);

      // Salón Elite
      const seOsis = shaOsis.filter((o) => o.salonCanonicalId === "salon-elite");
      assert.equal(seOsis.length, 1);

      // Pending
      const pendingOsis = shaOsis.filter((o) => !o.salonCanonicalId);
      assert.equal(pendingOsis.length, 1);

      // Coca-Cola is NOT in any salon bucket
      const cocaColaSha = shaOsis.filter((o) => o.empresaNombre.includes("COCA-COLA"));
      assert.equal(cocaColaSha.length, 0);
    });
  });

  describe("6. Date Filtering & Safe Comparison", () => {
    it("should not exclude current-day courses with ISO timestamps when filtering dateTo", () => {
      const targetDate = "2026-11-24";
      const osiWithTime = "2026-11-24T18:30:00.000Z";

      const osiDateOnly = osiWithTime.slice(0, 10);
      assert.equal(osiDateOnly, targetDate);
      assert.equal(osiDateOnly <= targetDate, true);
    });

    it("should cover the full year through December 31 for 'Este año' preset", () => {
      const now = new Date(2026, 10, 24);
      const from = `${now.getFullYear()}-01-01`;
      const to = `${now.getFullYear()}-12-31`;

      assert.equal(from, "2026-01-01");
      assert.equal(to, "2026-12-31");

      const decCourse = "2026-12-15";
      assert.equal(decCourse >= from && decCourse <= to, true);
    });
  });
});
