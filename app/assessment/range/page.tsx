import type { Metadata } from "next";
import Link from "next/link";
import { RangeTestView } from "./RangeTestView";

export const metadata: Metadata = {
  title: "Étendue vocale · Vocal Training",
  description: "Explorer les zones accessibles, fiables et confortables de sa voix.",
};

export default function RangeAssessmentPage() {
  return (
    <div className="space-y-5">
      <Link href="/assessment" className="text-sm text-fg-muted hover:text-fg">
        ← Évaluations
      </Link>
      <RangeTestView />
    </div>
  );
}
