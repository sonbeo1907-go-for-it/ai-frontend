import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>
      {children}
      {(error || hint) && (
        <span className={cn("mt-1.5 block text-xs", error ? "text-rose-600" : "text-slate-500")}>
          {error || hint}
        </span>
      )}
    </label>
  );
}
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950 placeholder:text-slate-400 disabled:bg-slate-100",
        className,
      )}
      {...props}
    />
  );
}
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "focus-ring w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-950 placeholder:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}
export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "focus-ring h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-950",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
