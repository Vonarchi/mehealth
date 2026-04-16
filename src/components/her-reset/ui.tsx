import React from "react";

type DivProps = React.PropsWithChildren<{ className?: string }>;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline";
  size?: "default" | "sm";
};

export function Card({ className = "", children }: DivProps) {
  return <div className={`rounded-2xl border border-slate-200 ${className}`}>{children}</div>;
}

export function CardHeader({ className = "", children }: DivProps) {
  return <div className={`p-6 pb-3 ${className}`}>{children}</div>;
}

export function CardTitle({ className = "", children }: DivProps) {
  return <h3 className={`text-lg font-semibold text-slate-900 ${className}`}>{children}</h3>;
}

export function CardDescription({ className = "", children }: DivProps) {
  return <p className={`text-sm text-slate-500 ${className}`}>{children}</p>;
}

export function CardContent({ className = "", children }: DivProps) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

export function Button({ className = "", variant = "default", size = "default", children, ...props }: ButtonProps) {
  const variantClass =
    variant === "outline"
      ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      : variant === "secondary"
        ? "bg-slate-100 text-slate-800 hover:bg-slate-200"
        : "bg-slate-900 text-white hover:bg-slate-800";
  const sizeClass = size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm";
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl font-medium transition ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      {...props}
      className={`w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-fuchsia-500 ${className}`}
    />
  );
});

export function Label({ className = "", children }: DivProps) {
  return <label className={`text-sm font-medium text-slate-800 ${className}`}>{children}</label>;
}

export function Progress({ value = 0, className = "" }: { value?: number; className?: string }) {
  return (
    <div className={`h-3 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div className="h-full rounded-full bg-fuchsia-600 transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Tabs({ children }: React.PropsWithChildren) {
  return <div>{children}</div>;
}

export function TabsList({ className = "", children }: DivProps) {
  return <div className={className}>{children}</div>;
}

export function TabsTrigger({
  children,
  active,
  onClick,
}: React.PropsWithChildren<{ active: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl py-3 text-sm font-medium transition ${active ? "bg-fuchsia-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ active, children }: React.PropsWithChildren<{ active: boolean }>) {
  if (!active) return null;
  return <div className="space-y-6">{children}</div>;
}

export function Badge({ className = "", children }: DivProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${className}`}>{children}</span>
  );
}

export function Checkbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      className="h-5 w-5 rounded border-slate-300 accent-fuchsia-600"
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-fuchsia-500 ${props.className ?? ""}`}
    />
  );
}

export function Avatar({ children }: React.PropsWithChildren) {
  return <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">{children}</div>;
}

export function AvatarFallback({ children }: React.PropsWithChildren) {
  return <span className="text-xs font-semibold text-pink-700">{children}</span>;
}

export function ScrollArea({ className = "", children }: DivProps) {
  return <div className={`overflow-y-auto ${className}`}>{children}</div>;
}
