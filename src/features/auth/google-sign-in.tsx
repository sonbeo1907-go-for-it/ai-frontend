"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { useAuth } from "./auth-context";
import { useToast } from "@/components/providers/toast-provider";
import { getErrorMessage } from "@/lib/api-client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleSignIn({
  onSuccess,
}: {
  onSuccess: (role: "USER" | "ADMIN", setupComplete: boolean) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const { loginWithGoogle } = useAuth();
  const { show } = useToast();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
    clientId ? "loading" : "unavailable",
  );

  useEffect(() => {
    if (!clientId || !container.current) {
      setStatus("unavailable");
      return;
    }

    let cancelled = false;
    const loadTimeoutId = window.setTimeout(() => {
      if (!cancelled) setStatus("unavailable");
    }, 10_000);

    const render = () => {
      if (cancelled || !window.google || !container.current) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            void loginWithGoogle(credential)
              .then((profile) => onSuccess(profile.role, Boolean(profile.profile?.setupCompleted)))
              .catch((error) => show(getErrorMessage(error), "error"));
          },
        });
        window.google.accounts.id.renderButton(container.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: container.current.offsetWidth,
          text: "continue_with",
        });
        window.clearTimeout(loadTimeoutId);
        setStatus("ready");
      } catch {
        window.clearTimeout(loadTimeoutId);
        setStatus("unavailable");
      }
    };

    const handleLoadError = () => {
      window.clearTimeout(loadTimeoutId);
      setStatus("unavailable");
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existing) {
      if (window.google) render();
      else existing.addEventListener("load", render, { once: true });
      existing.addEventListener("error", handleLoadError, { once: true });
      return () => {
        cancelled = true;
        window.clearTimeout(loadTimeoutId);
        existing.removeEventListener("load", render);
        existing.removeEventListener("error", handleLoadError);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = render;
    script.onerror = handleLoadError;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeoutId);
      script.onload = null;
      script.onerror = null;
    };
  }, [clientId, loginWithGoogle, onSuccess, show]);

  return (
    <div className="relative min-h-11 w-full">
      <div
        ref={container}
        className={status === "ready" ? "w-full" : "invisible absolute inset-0 w-full"}
      />
      {status === "loading" && (
        <div className="flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-500">
          <LoaderCircle className="size-4 animate-spin" />
          Đang tải đăng nhập Google…
        </div>
      )}
      {status === "unavailable" && (
        <div
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          role="status"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>
            Đăng nhập Google hiện không khả dụng. Bạn vẫn có thể đăng nhập bằng email và mật khẩu.
          </p>
        </div>
      )}
    </div>
  );
}
