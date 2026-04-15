import { notFound } from "next/navigation";
import { initializeAlgorithms } from "@/algorithm";
import { getPreset } from "@/algorithm";
import { VisualizerClient } from "./VisualizerClient";

initializeAlgorithms();

interface PageProps {
  params: Promise<{ algorithm: string }>;
}

export default async function VisualizePage({ params }: PageProps) {
  const { algorithm: algorithmId } = await params;
  const preset = getPreset(algorithmId);

  if (!preset) {
    notFound();
  }

  return <VisualizerClient preset={preset} />;
}
