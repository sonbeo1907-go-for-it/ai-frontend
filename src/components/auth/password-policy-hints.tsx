"use client";

import { useMemo } from "react";
import { Check, Circle } from "lucide-react";
import { validatePasswordPolicy } from "@/lib/password-policy";

interface PasswordPolicyHintsProps {
  password: string;
  className?: string;
}

export function PasswordPolicyHints({ password, className = "" }: PasswordPolicyHintsProps) {
  const { rules } = useMemo(() => validatePasswordPolicy(password), [password]);

  return (
    <div className={`mt-2 space-y-1.5 text-xs ${className}`} data-testid="password-policy-hints">
      <p className="font-semibold text-slate-600">Yêu cầu mật khẩu:</p>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 text-slate-500">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 transition-colors duration-200 ${
              rule.ok ? "font-medium text-emerald-600" : "text-slate-500"
            }`}
          >
            {rule.ok ? (
              <Check className="size-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="size-2 shrink-0 fill-slate-300 text-slate-300" />
            )}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
