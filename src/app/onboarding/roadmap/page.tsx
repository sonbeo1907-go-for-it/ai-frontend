import { BookOpen } from "lucide-react";
import { OnboardingRoute } from "@/features/auth/protected-route";
import { RoadmapOnboardingForm } from "@/features/roadmaps/roadmap-onboarding-form";
export default function RoadmapOnboardingPage() {
  return (
    <OnboardingRoute>
      <main className="min-h-screen bg-slate-50">
        <header className="flex h-20 items-center border-b border-slate-200 bg-white px-6 sm:px-10">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">
              <BookOpen className="size-4" />
            </span>
            <span className="font-black">Lumio</span>
          </div>
        </header>
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center p-6 sm:p-10">
          <RoadmapOnboardingForm />
        </div>
      </main>
    </OnboardingRoute>
  );
}
