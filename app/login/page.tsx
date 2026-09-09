import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SetupRequired } from "@/components/auth/SetupRequired";
import { Spinner } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  if (!isSupabaseConfigured) return <SetupRequired />;
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[60vh] place-items-center">
          <Spinner />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
