import { notFound } from "next/navigation";
import { getPreset } from "@/algorithm";
import { initializeAlgorithms } from "@/algorithm/presets";
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
