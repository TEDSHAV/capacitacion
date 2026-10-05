import React from "react";
import { InterdepartamentalHubClient } from "./InterdepartamentalHubClient";
import {
  getInterdepartamentalContext,
  getOsisForInterdepartamental,
  getFacilitatorsForInterdepartamental,
  getRecentPurchaseOrders,
} from "@/app/actions/interdepartamental";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal Interdepartamental | SHA Capacitación",
  description:
    "Punto de enlace para otros departamentos: consignar órdenes de compra y consultar fichas técnicas de facilitadores.",
};

export default async function UnauthorizedPage() {
  const [context, osis, facilitators, recentPOs] = await Promise.all([
    getInterdepartamentalContext(),
    getOsisForInterdepartamental(),
    getFacilitatorsForInterdepartamental(),
    getRecentPurchaseOrders(10),
  ]);

  return (
    <InterdepartamentalHubClient
      user={context.user}
      initialOsis={osis}
      initialFacilitators={facilitators}
      initialRecentPOs={recentPOs}
    />
  );
}
