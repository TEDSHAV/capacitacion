"use server";

// Notification bridge: forwards requisicion notification events to the PRISMA
// shell's internal dispatch endpoint (`/api/requisiciones/notify`) so the
// notification fan-out logic stays single-source in the shell.
//
// Every function here mirrors the signature of the corresponding function in
// `shell-app/actions/requisicion-notifications.ts`. Failures are logged but
// never thrown — notifications are best-effort and must not break the caller's
// data action (matching the shell's own try/catch behavior).

const NOTIFY_ENDPOINT = `${process.env.NEXT_PUBLIC_SHELL_URL || ""}/api/requisiciones/notify`;
const NOTIFY_SECRET = process.env.REQUISICIONES_NOTIFY_SECRET;

async function dispatch(event: string, args: unknown[]): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SHELL_URL || !NOTIFY_SECRET) {
    console.warn(
      `[requisiciones-notify-bridge] Skipping "${event}": NEXT_PUBLIC_SHELL_URL or REQUISICIONES_NOTIFY_SECRET is not set`,
    );
    return;
  }

  try {
    const res = await fetch(NOTIFY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": NOTIFY_SECRET,
      },
      body: JSON.stringify({ event, args }),
      // Don't let a slow shell hang the data action.
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[requisiciones-notify-bridge] "${event}" failed: ${res.status} ${text}`,
      );
    }
  } catch (err) {
    console.error(
      `[requisiciones-notify-bridge] "${event}" threw:`,
      err,
    );
  }
}

export async function notifyAdminsOfNewRequisicion(
  requisicionId: number,
  solicitanteName: string,
  requisicionLabel: string,
) {
  await dispatch("notifyAdminsOfNewRequisicion", [
    requisicionId,
    solicitanteName,
    requisicionLabel,
  ]);
}

export async function notifyLiderOfPendingInterna(
  requisicionId: number,
  solicitanteName: string,
  departamentoName: string,
) {
  await dispatch("notifyLiderOfPendingInterna", [
    requisicionId,
    solicitanteName,
    departamentoName,
  ]);
}

export async function notifyCoordinadorOfPendingExterna(
  requisicionId: number,
  solicitanteName: string,
  departamentoName: string,
) {
  await dispatch("notifyCoordinadorOfPendingExterna", [
    requisicionId,
    solicitanteName,
    departamentoName,
  ]);
}

export async function notifyCreatorOfProcesada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
) {
  await dispatch("notifyCreatorOfProcesada", [
    requisicionId,
    creatorAuthId,
    requisicionLabel,
  ]);
}

export async function notifyCreatorOfRechazada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  motivoRechazo?: string,
) {
  await dispatch("notifyCreatorOfRechazada", [
    requisicionId,
    creatorAuthId,
    requisicionLabel,
    motivoRechazo,
  ]);
}

export async function notifyCreatorOfCoordinadorRechazada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  motivo: string,
) {
  await dispatch("notifyCreatorOfCoordinadorRechazada", [
    requisicionId,
    creatorAuthId,
    requisicionLabel,
    motivo,
  ]);
}

export async function notifyCreatorOfLiderRechazada(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  motivo: string,
) {
  await dispatch("notifyCreatorOfLiderRechazada", [
    requisicionId,
    creatorAuthId,
    requisicionLabel,
    motivo,
  ]);
}

export async function notifyCreatorOfPartialVerificacion(
  requisicionId: number,
  creatorAuthId: string,
  verifiedCount: number,
  totalCount: number,
  requisicionLabel: string,
) {
  await dispatch("notifyCreatorOfPartialVerificacion", [
    requisicionId,
    creatorAuthId,
    verifiedCount,
    totalCount,
    requisicionLabel,
  ]);
}

export async function notifyAdminOfAcuseRecibo(
  requisicionId: number,
  adminAuthId: string,
  solicitanteName: string,
  requisicionLabel: string,
) {
  await dispatch("notifyAdminOfAcuseRecibo", [
    requisicionId,
    adminAuthId,
    solicitanteName,
    requisicionLabel,
  ]);
}

export async function notifyCreatorOfApproverChanges(
  requisicionId: number,
  creatorAuthId: string,
  requisicionLabel: string,
  approverRole: string,
) {
  await dispatch("notifyCreatorOfApproverChanges", [
    requisicionId,
    creatorAuthId,
    requisicionLabel,
    approverRole,
  ]);
}
