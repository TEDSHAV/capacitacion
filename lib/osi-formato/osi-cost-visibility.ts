export type OsiCostVisibilityFormato = "capacitacion" | "servicios_tecnicos";

export type OsiCostVisibilityConfigRow = {
  formato: OsiCostVisibilityFormato;
  allowed_role_slugs: string[];
  allowed_departamento_ids: number[];
  allowed_user_ids: number[];
  denied_user_ids: number[];
  default_public_cost_mask: Record<string, boolean>;
  default_hide_monetary: boolean;
  /** Solo servicios_tecnicos: días por defecto en seguimiento de garantía (ej. 15 → "15 días"). */
  default_st_garantia_dias: number;
};

export type OsiCostVisibilityUserContext = {
  role: string | null;
  role_slugs?: string[];
  app_roles?: Record<string, string>;
  usuario_id?: number | null;
  departamento_id: number | null;
  permission_slugs?: string[];
};

export type ParsedAppRoleEntry = {
  app_slug: string | null;
  role_slug: string;
};

export function to_app_role_key(app_slug: string, role_slug: string): string {
  return `${app_slug.trim().toLowerCase()}:${role_slug.trim().toLowerCase()}`;
}

export function parse_app_role_key(value: string): ParsedAppRoleEntry {
  const trimmed = value.trim();
  const colon = trimmed.indexOf(":");
  if (colon > 0) {
    return {
      app_slug: trimmed.slice(0, colon).toLowerCase(),
      role_slug: trimmed.slice(colon + 1).toLowerCase(),
    };
  }
  return { app_slug: null, role_slug: trimmed.toLowerCase() };
}

function normalize_role_slug(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[:\s]+/g, "_")
    .replace(/_+/g, "_");
}

function role_slug_matches(
  allowed_role: string,
  candidate_role: string,
): boolean {
  if (!allowed_role || !candidate_role) return false;
  if (allowed_role === candidate_role) return true;
  return (
    candidate_role.includes(allowed_role) || allowed_role.includes(candidate_role)
  );
}

function parse_json_string_array(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function parse_json_number_array(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const item of value) {
    const n = Number(item);
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

function parse_positive_int(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(n);
}

function parse_mask_record(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, boolean> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    out[key] = Boolean(raw);
  }
  return out;
}

export function parse_osi_cost_visibility_row(
  row: Record<string, unknown> | null | undefined,
): OsiCostVisibilityConfigRow | null {
  if (!row) return null;
  const formato = row.formato;
  if (formato !== "capacitacion" && formato !== "servicios_tecnicos") return null;
  return {
    formato,
    allowed_role_slugs: parse_json_string_array(row.allowed_role_slugs),
    allowed_departamento_ids: parse_json_number_array(
      row.allowed_departamento_ids,
    ),
    allowed_user_ids: parse_json_number_array(row.allowed_user_ids),
    denied_user_ids: parse_json_number_array(row.denied_user_ids),
    default_public_cost_mask: parse_mask_record(row.default_public_cost_mask),
    default_hide_monetary: Boolean(row.default_hide_monetary),
    default_st_garantia_dias:
      formato === "servicios_tecnicos"
        ? parse_positive_int(row.default_st_garantia_dias, 15)
        : 15,
  };
}

function role_matches_allowed(
  ctx: OsiCostVisibilityUserContext,
  allowed_role_slugs: string[],
): boolean {
  if (allowed_role_slugs.length === 0) return false;

  const flat_candidates = [ctx.role, ...(ctx.role_slugs ?? [])]
    .map(normalize_role_slug)
    .filter((value) => value.length > 0);

  for (const raw_allowed of allowed_role_slugs) {
    const parsed = parse_app_role_key(raw_allowed);
    const normalized_role = normalize_role_slug(parsed.role_slug);

    if (parsed.app_slug && ctx.app_roles) {
      const app_role = normalize_role_slug(ctx.app_roles[parsed.app_slug]);
      if (role_slug_matches(normalized_role, app_role)) {
        return true;
      }
    }

    for (const candidate of flat_candidates) {
      if (role_slug_matches(normalized_role, candidate)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determina si el usuario puede ver costos privados (Cap máscara / montos ST).
 */
export function user_can_reveal_osi_costs(
  formato: OsiCostVisibilityFormato,
  config: OsiCostVisibilityConfigRow | null,
  ctx: OsiCostVisibilityUserContext,
): boolean {
  if (!config) {
    if (formato === "capacitacion") {
      return (ctx.permission_slugs ?? []).includes("finance:osi:edit");
    }
    const role = normalize_role_slug(ctx.role);
    return (
      role.includes("superadmin") ||
      role === "admin" ||
      role.includes("administrador") ||
      role === "gestor_financiero"
    );
  }

  const usuario_id = ctx.usuario_id;

  if (role_matches_allowed(ctx, config.allowed_role_slugs)) {
    if (
      usuario_id == null ||
      usuario_id <= 0 ||
      !config.denied_user_ids.includes(usuario_id)
    ) {
      return true;
    }
  }

  if (
    usuario_id != null &&
    usuario_id > 0 &&
    config.allowed_user_ids.includes(usuario_id)
  ) {
    return true;
  }

  const deptId = ctx.departamento_id;
  if (
    deptId != null &&
    deptId > 0 &&
    config.allowed_departamento_ids.includes(deptId)
  ) {
    if (
      usuario_id != null &&
      usuario_id > 0 &&
      config.denied_user_ids.includes(usuario_id)
    ) {
      return false;
    }
    return true;
  }

  if (
    formato === "capacitacion" &&
    (ctx.permission_slugs ?? []).includes("finance:osi:edit")
  ) {
    return true;
  }

  return false;
}
