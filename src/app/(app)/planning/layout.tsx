import type { ReactNode } from "react";
import { PlanLayout } from "@/features/planning/plan-layout";

export default function PlanningLayout({ children }: { children: ReactNode }) {
  return <PlanLayout>{children}</PlanLayout>;
}
