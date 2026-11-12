import { Metadata } from "next";
import { notFound } from "next/navigation";
import { OsiDetailClient } from "./OsiDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Formato OSI #${id} | Capacitación`,
    description: "Formato oficial de la Orden de Servicio de Capacitación.",
  };
}

export default async function OsiDetailPage({ params }: PageProps) {
  const { id } = await params;
  const osiId = parseInt(id, 10);

  if (isNaN(osiId) || osiId <= 0) {
    notFound();
  }

  return <OsiDetailClient osiId={osiId} />;
}

