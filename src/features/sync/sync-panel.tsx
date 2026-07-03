import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { exportBundle, isTauri, syncPull, syncPush, syncStatus } from "@/lib/tauri";
import type { DiffEntry } from "@/lib/types";
import { Check, Download, GitPullRequestArrow, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { mutate } from "swr";

/**
 * Panel de sincronización multi-dispositivo (ADR-0006). Exporta el bundle canónico
 * (sin secretos) y hace push/pull manual contra un repo git, con diff previo.
 */
export function SyncPanel() {
  const native = isTauri();
  const [bundle, setBundle] = useState("");
  const [repo, setRepo] = useState("");
  const [diff, setDiff] = useState<DiffEntry[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    exportBundle()
      .then(setBundle)
      .catch(() => setBundle(""));
  }, []);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setMsg(`error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="mb-1 font-semibold text-sm tracking-[0.08em]">SYNC</h1>
      <p className="mb-5 font-sans text-muted-foreground text-xs">
        Bundle canónico portable, <strong>sin valores de secretos</strong> (solo referencias).
        Push/Pull manual contra un repo de GitHub, con diff previo. Ver ADR-0006.
      </p>

      <Card className="mb-4 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] tracking-[0.16em] text-muted-foreground">BUNDLE</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportBundle().then(setBundle)}
            disabled={busy}
          >
            <Download size={13} />
            regenerar
          </Button>
        </div>
        <pre className="max-h-72 overflow-auto rounded-[var(--radius-sm)] border border-border bg-surface p-3 text-[11px] text-muted-foreground leading-relaxed">
          {bundle || "—"}
        </pre>
      </Card>

      <Card className="p-4">
        <div className="mb-3 text-[10px] tracking-[0.16em] text-muted-foreground">REPOSITORIO</div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-[240px] flex-1 border border-border bg-surface px-3 py-2 rounded-[var(--radius-sm)]"
            placeholder="/ruta/a/tu/repo-git"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!native || !repo || busy}
            onClick={() => run(() => syncStatus(repo).then(setDiff), "diff calculado")}
          >
            <GitPullRequestArrow size={13} />
            diff
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!native || !repo || busy}
            onClick={() => run(() => syncPush(repo), "push OK")}
          >
            <Upload size={13} />
            push
          </Button>
          <Button
            variant="accent"
            size="sm"
            disabled={!native || !repo || busy}
            onClick={() =>
              run(async () => {
                await syncPull(repo);
                await mutate("scan-agents");
              }, "pull aplicado")
            }
          >
            <Check size={13} />
            pull + aplicar
          </Button>
        </div>

        {!native && (
          <p className="mt-3 text-warning text-xs">
            {"> push/pull requieren la app nativa + git; el bundle sí se puede exportar aquí."}
          </p>
        )}
        {msg && <p className="mt-3 text-muted-foreground text-xs">{`> ${msg}`}</p>}

        {diff && (
          <div className="mt-4">
            <div className="mb-2 text-[10px] tracking-[0.16em] text-muted-foreground">
              CAMBIOS AL APLICAR ({diff.length})
            </div>
            {diff.length === 0 ? (
              <p className="text-faint text-xs">{"> sin cambios (todo al día)"}</p>
            ) : (
              <ul className="flex flex-col gap-1 font-mono text-xs">
                {diff.map((d) => (
                  <li key={`${d.agent}:${d.change}`} className="text-muted-foreground">
                    <span className="text-faint">{d.agent}</span> {d.change}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
