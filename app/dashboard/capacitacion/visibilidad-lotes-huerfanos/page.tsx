import { redirect } from "next/navigation";
import { OrphanBatchesClient } from "./OrphanBatchesClient";

export default async function VisibilidadLotesHuerfanosPage() {
  if (process.env.NODE_ENV !== "development") {
    redirect("/dashboard/capacitacion");
  }

  return <OrphanBatchesClient />;
}
