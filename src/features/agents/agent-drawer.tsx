import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { agentMeta } from "@/lib/agents";
import { listProviders, readRules, writeRules } from "@/lib/tauri";
import type { AgentScan, ProviderInfo } from "@/lib/types";
import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { mutate } from "swr";

type Tab = "overview" | "providers" | "rules";

/** Panel de detalle deslizante por agente (drawer del mockup). */
export function AgentDrawer({ agent, onClose }: { agent: AgentScan; onClose: () => void }) {
  const meta = agentMeta(agent.id);
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 z-60 border-none bg-black/55"
        style={{ animation: "nf-fade .15s ease" }}
      />
      <aside
        className="fixed top-0 right-0 z-61 flex h-full w-[480px] max-w-[92vw] flex-col border-border-strong border-l bg-elevated"
        style={{ animation: "nf-slide .2s ease", boxShadow: "-24px 0 70px rgba(0,0,0,0.5)" }}
      >
        <header className="border-border border-b p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="avatar" className="h-10 w-10">
                {meta.badge}
              </Badge>
              <div>
                <div className="font-semibold text-[17px]">{meta.name}</div>
                <div className="text-muted-foreground text-xs">
                  {agent.detected ? "detectado" : "no detectado"}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
              <X size={15} />
            </Button>
          </div>
          <div className="mt-3 truncate text-[11px] text-faint" title={agent.configPath}>
            {agent.configPath}
          </div>
        </header>

        <nav className="flex border-border border-b px-6">
          {(["overview", "providers", "rules"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`border-b-2 px-4 py-3.5 font-mono text-[11px] tracking-[0.12em] uppercase ${
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-auto p-6">
          {tab === "overview" && <Overview agent={agent} />}
          {tab === "providers" && <ProvidersTab agentId={agent.id} />}
          {tab === "rules" && <RulesTab agentId={agent.id} />}
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[10px] tracking-[0.16em] text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Overview({ agent }: { agent: AgentScan }) {
  return (
    <>
      <Section title="MODELO">
        <div className="text-sm">{agent.config.model ?? "not set"}</div>
      </Section>
      <Section title={`MCPS (${agent.mcps.length})`}>
        <ul className="flex flex-col gap-1 text-xs">
          {agent.mcps.map((m) => (
            <li key={m.name} className="flex justify-between gap-3">
              <span>{m.name}</span>
              <span className="truncate text-faint">{m.target}</span>
            </li>
          ))}
          {agent.mcps.length === 0 && <li className="text-faint">—</li>}
        </ul>
      </Section>
      <Section title={`SKILLS (${agent.skills.length})`}>
        <ul className="flex flex-col gap-1 text-xs">
          {agent.skills.map((s) => (
            <li key={s.name}>{s.name}</li>
          ))}
          {agent.skills.length === 0 && <li className="text-faint">—</li>}
        </ul>
      </Section>
    </>
  );
}

function ProvidersTab({ agentId }: { agentId: string }) {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);

  useEffect(() => {
    listProviders(agentId)
      .then(setProviders)
      .catch(() => setProviders([]));
  }, [agentId]);

  if (!providers) return <p className="text-faint text-xs">{"> cargando…"}</p>;

  return (
    <>
      <p className="mb-4 font-sans text-muted-foreground text-xs">
        Proveedores definidos en la config. Las API keys <strong>no se muestran</strong>: solo el
        nombre de la variable de entorno que las aporta (ADR-0004).
      </p>
      {providers.length === 0 ? (
        <p className="text-faint text-xs">
          {"> este agente no declara proveedores en archivo (usa env vars)."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {providers.map((p) => (
            <li key={p.id} className="border border-border p-3 rounded-[var(--radius-sm)]">
              <div className="font-semibold text-[13px]">{p.name ?? p.id}</div>
              {p.baseUrl && <div className="mt-1 truncate text-faint text-xs">{p.baseUrl}</div>}
              {p.keyEnv && (
                <div className="mt-1 text-muted-foreground text-xs">
                  key: <span className="text-warning">${`{${p.keyEnv}}`}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function RulesTab({ agentId }: { agentId: string }) {
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    readRules(agentId)
      .then((c) => {
        setContent(c);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [agentId]);

  const save = async () => {
    setMsg(null);
    try {
      await writeRules(agentId, content);
      await mutate("scan-agents");
      setMsg("guardado");
    } catch (e) {
      setMsg(`error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={!loaded}
        spellCheck={false}
        placeholder="# Reglas del agente…"
        className="min-h-64 flex-1 resize-none border border-border bg-surface p-3 font-mono text-muted-foreground text-xs leading-relaxed outline-none rounded-[var(--radius-sm)]"
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-faint text-xs">{msg ? `> ${msg}` : ""}</span>
        <Button variant="accent" size="sm" onClick={save} disabled={!loaded}>
          <Save size={13} />
          guardar
        </Button>
      </div>
    </div>
  );
}
