import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n";
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
  const t = useT();
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
      setMsg(t("common.error", { err: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="mb-1 font-semibold text-sm tracking-[0.08em]">{t("sync.title")}</h1>
      <p className="mb-5 font-sans text-muted-foreground text-xs">{t("sync.intro")}</p>

      <Card className="mb-4 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] tracking-[0.16em] text-muted-foreground">
            {t("sync.bundle")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportBundle().then(setBundle)}
            disabled={busy}
          >
            <Download size={13} />
            {t("sync.regenerate")}
          </Button>
        </div>
        <pre className="max-h-72 overflow-auto rounded-[var(--radius-sm)] border border-border bg-surface p-3 text-[11px] text-muted-foreground leading-relaxed">
          {bundle || "—"}
        </pre>
      </Card>

      <Card className="p-4">
        <div className="mb-3 text-[10px] tracking-[0.16em] text-muted-foreground">
          {t("sync.repository")}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            size="sm"
            className="min-w-[240px] flex-1"
            placeholder={t("sync.repoPlaceholder")}
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!native || !repo || busy}
            onClick={() => run(() => syncStatus(repo).then(setDiff), t("sync.diffOk"))}
          >
            <GitPullRequestArrow size={13} />
            {t("sync.diff")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!native || !repo || busy}
            onClick={() => run(() => syncPush(repo), t("sync.pushOk"))}
          >
            <Upload size={13} />
            {t("sync.push")}
          </Button>
          <Button
            variant="accent"
            size="sm"
            disabled={!native || !repo || busy}
            onClick={() =>
              run(async () => {
                await syncPull(repo);
                await mutate("scan-agents");
              }, t("sync.pullOk"))
            }
          >
            <Check size={13} />
            {t("sync.pullApply")}
          </Button>
        </div>

        {!native && <p className="mt-3 text-warning text-xs">{t("sync.nativeOnly")}</p>}
        {msg && <p className="mt-3 text-muted-foreground text-xs">{`> ${msg}`}</p>}

        {diff && (
          <div className="mt-4">
            <div className="mb-2 text-[10px] tracking-[0.16em] text-muted-foreground">
              {t("sync.changesOnApply", { n: diff.length })}
            </div>
            {diff.length === 0 ? (
              <p className="text-faint text-xs">{t("sync.noChanges")}</p>
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
