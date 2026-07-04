import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PromptOptions {
  title: string;
  message?: ReactNode;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface DialogApi {
  /** Reemplazo shadcn de `window.confirm`. Resuelve `true` si el usuario confirma. */
  confirm(opts: ConfirmOptions): Promise<boolean>;
  /** Reemplazo shadcn de `window.prompt`. Resuelve el texto, o `null` si se cancela. */
  prompt(opts: PromptOptions): Promise<string | null>;
}

type Pending =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOptions; resolve: (v: string | null) => void };

const DialogContext = createContext<DialogApi | null>(null);

/** Envuelve la app para exponer `useDialog()` con confirm/prompt en estilo shadcn. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ kind: "confirm", opts, resolve })),
    [],
  );

  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setValue(opts.defaultValue ?? "");
        setPending({ kind: "prompt", opts, resolve });
      }),
    [],
  );

  const close = useCallback(
    (result: boolean | string | null) => {
      if (!pending) return;
      if (pending.kind === "confirm") pending.resolve(result === true);
      else pending.resolve(typeof result === "string" ? result : null);
      setPending(null);
    },
    [pending],
  );

  // Enfocar el input al abrir un prompt; cerrar con Escape.
  useEffect(() => {
    if (pending?.kind === "prompt") inputRef.current?.focus();
    if (!pending) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && close(pending.kind === "confirm" ? false : null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending?.kind === "prompt") close(value.trim() ? value : "");
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/55 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close(pending.kind === "confirm" ? false : null);
          }}
        >
          <Card className="w-full max-w-md p-5">
            <div className="mb-3 flex items-start justify-between gap-4">
              <span className="font-semibold text-sm tracking-[0.08em]">{pending.opts.title}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => close(pending.kind === "confirm" ? false : null)}
                aria-label="Cerrar"
              >
                <X size={16} />
              </Button>
            </div>

            {pending.opts.message && (
              <p className="mb-4 font-sans text-muted-foreground text-xs">{pending.opts.message}</p>
            )}

            {pending.kind === "prompt" ? (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <Input
                  ref={inputRef}
                  value={value}
                  placeholder={pending.opts.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full border border-border bg-surface px-3 py-2 rounded-[var(--radius-sm)]"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => close(null)}>
                    {pending.opts.cancelLabel ?? "Cancelar"}
                  </Button>
                  <Button type="submit" variant="accent" size="sm">
                    {pending.opts.confirmLabel ?? "Guardar"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => close(false)}>
                  {pending.opts.cancelLabel ?? "Cancelar"}
                </Button>
                <Button
                  type="button"
                  variant={pending.opts.danger ? "accent" : "outline"}
                  size="sm"
                  onClick={() => close(true)}
                  className={
                    pending.opts.danger ? "bg-danger text-white hover:opacity-[0.88]" : undefined
                  }
                >
                  {pending.opts.confirmLabel ?? "Confirmar"}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </DialogContext.Provider>
  );
}

/** Acceso al confirm/prompt en estilo shadcn. Debe estar dentro de `<DialogProvider>`. */
export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog debe usarse dentro de <DialogProvider>");
  return ctx;
}
