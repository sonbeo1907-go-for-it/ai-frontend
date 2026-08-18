"use client";
import { useEffect, useRef } from "react";
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
  useEffect(() => {
    if (!clientId || !container.current) return;
    const render = () => {
      if (!window.google || !container.current) return;
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
    };
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      if (window.google) render();
      else existing.addEventListener("load", render, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [clientId, loginWithGoogle, onSuccess, show]);
  if (!clientId) return null;
  return <div className="w-full" ref={container} />;
}
