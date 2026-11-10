import { BookOpen } from "lucide-react";
import { OnboardingRoute } from "@/features/auth/protected-route";
import { ProfileSetupForm } from "@/features/profile/profile-setup-form";
export default function ProfileOnboardingPage() {
  return (
    <OnboardingRoute>
      <main className="min-h-screen bg-white">
        <header className="flex h-20 items-center border-b border-slate-100 px-6 sm:px-10">
          <div className="flex items-center gap-2.5 text-slate-950">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">
              <BookOpen className="size-4" />
            </span>
            <span className="font-black">Lumio</span>
          </div>
        </header>
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center p-6 sm:p-10">
          <ProfileSetupForm />
        </div>
      </main>
    </OnboardingRoute>
  );
}
