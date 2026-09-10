"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type { EmailTemplate, EmailTemplateListItem, EmailEventType } from "@/types/email";

/**
 * CRUD server actions for `capacitacion_email_templates`.
 *
 * The "is_default" flag is unique-in-spirit per event_type: setting a template
 * as default clears the flag on all other templates of the same event_type.
 */

const REVALIDATE = "/dashboard/capacitacion/plantillas-email";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getEmailTemplates(): Promise<EmailTemplateListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("capacitacion_email_templates")
    .select("id, name, slug, event_type, is_default, is_active, updated_at")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[getEmailTemplates] error:", error);
    return [];
  }
  return (data ?? []) as EmailTemplateListItem[];
}

export async function getEmailTemplate(
  id: number,
): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("capacitacion_email_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: (data as EmailTemplate) ?? null, error: null };
}

export async function getDefaultEmailTemplate(
  eventType: EmailEventType = "asignacion_facilitador",
): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("capacitacion_email_templates")
    .select("*")
    .eq("event_type", eventType)
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (data) return { data: data as EmailTemplate, error: null };

  // Fallback: any active template of this event type.
  const { data: fallback, error: fbErr } = await supabase
    .from("capacitacion_email_templates")
    .select("*")
    .eq("event_type", eventType)
    .eq("is_active", true)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fbErr) return { data: null, error: fbErr.message };
  return { data: (fallback as EmailTemplate) ?? null, error: null };
}

export interface EmailTemplateInput {
  name: string;
  slug?: string;
  event_type?: EmailEventType;
  subject: string;
  body: string;
  is_default?: boolean;
  is_active?: boolean;
}

export async function createEmailTemplate(
  input: EmailTemplateInput,
): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const supabase = await createClient();
  const userRes = await supabase.auth.getUser();
  const createdBy = userRes.data.user?.id ?? null;

  if (!input.name?.trim() || !input.subject?.trim() || !input.body?.trim()) {
    return { data: null, error: "Nombre, asunto y cuerpo son obligatorios." };
  }

  const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(input.name)) || `tpl-${Date.now()}`;
  const eventType: EmailEventType = input.event_type || "asignacion_facilitador";
  const isDefault = input.is_default ?? false;

  // Uniqueness check on slug.
  const { data: existing } = await supabase
    .from("capacitacion_email_templates")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return { data: null, error: `El slug "${slug}" ya existe.` };
  }

  // Clear other defaults for this event_type if this one is default.
  if (isDefault) {
    await clearDefaults(supabase, eventType);
  }

  const { data, error } = await supabase
    .from("capacitacion_email_templates")
    .insert({
      name: input.name.trim(),
      slug,
      event_type: eventType,
      subject: input.subject.trim(),
      body: input.body,
      is_default: isDefault,
      is_active: input.is_active ?? true,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error("[createEmailTemplate] error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath(REVALIDATE);
  return { data: data as EmailTemplate, error: null };
}

export async function updateEmailTemplate(
  id: number,
  input: Partial<EmailTemplateInput>,
): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const supabase = await createClient();

  if (!id) return { data: null, error: "ID requerido." };

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.subject !== undefined) patch.subject = input.subject.trim();
  if (input.body !== undefined) patch.body = input.body;
  if (input.is_active !== undefined) patch.is_active = input.is_active;
  if (input.event_type !== undefined) patch.event_type = input.event_type;
  if (input.slug !== undefined && input.slug.trim()) {
    const newSlug = slugify(input.slug);
    const { data: clash } = await supabase
      .from("capacitacion_email_templates")
      .select("id")
      .eq("slug", newSlug)
      .neq("id", id)
      .maybeSingle();
    if (clash) return { data: null, error: `El slug "${newSlug}" ya existe.` };
    patch.slug = newSlug;
  }

  // Handle is_default: if setting true, clear others of the same event_type.
  if (input.is_default === true) {
    const { data: current } = await supabase
      .from("capacitacion_email_templates")
      .select("event_type")
      .eq("id", id)
      .maybeSingle();
    const eventType = (current?.event_type as EmailEventType) || input.event_type || "asignacion_facilitador";
    await clearDefaults(supabase, eventType, id);
    patch.is_default = true;
  } else if (input.is_default === false) {
    patch.is_default = false;
  }

  const { data, error } = await supabase
    .from("capacitacion_email_templates")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateEmailTemplate] error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath(REVALIDATE);
  return { data: data as EmailTemplate, error: null };
}

export async function deleteEmailTemplate(
  id: number,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("capacitacion_email_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteEmailTemplate] error:", error);
    return { error: error.message };
  }

  revalidatePath(REVALIDATE);
  return { error: null };
}

/** Clear is_default on all templates of `eventType` (optionally excluding `exceptId`). */
async function clearDefaults(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventType: EmailEventType,
  exceptId?: number,
): Promise<void> {
  let q = supabase
    .from("capacitacion_email_templates")
    .update({ is_default: false })
    .eq("event_type", eventType)
    .eq("is_default", true);
  if (exceptId) q = q.neq("id", exceptId);
  await q;
}
