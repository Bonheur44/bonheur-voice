import type { Metadata } from "next";
import { AssessmentHub } from "./AssessmentHub";

export const metadata: Metadata = {
  title: "Évaluer ma voix · Vocal Training",
  description: "Étendue, justesse, stabilité : ce que les observations indiquent, et ce qui reste incertain.",
};

export default function AssessmentPage() {
  return <AssessmentHub />;
}
