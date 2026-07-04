import { AgentsPanel } from "@/features/agents/agents-panel";
import { McpMatrix } from "@/features/mcps/mcp-matrix";
import { SecretsPanel } from "@/features/secrets/secrets-panel";
import { SyncPanel } from "@/features/sync/sync-panel";
import { isTauri } from "@/lib/tauri";
import { useState } from "react";
import { mutate } from "swr";
import { DockNav, useNav } from "./dock-nav";
import { GridBackground } from "./grid-background";
import { TopBar } from "./top-bar";

export function App() {
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const section = useNav((s) => s.active);

  const onScan = async () => {
    setScanning(true);
    await mutate("scan-agents");
    setScanning(false);
  };

  return (
    <div className="relative min-h-screen">
      <GridBackground />
      <DockNav />

      <main className="relative z-1 min-h-screen overflow-auto pt-7 pr-7 pb-10 pl-[104px]">
        <div className="mx-auto max-w-[1180px]">
          <TopBar query={query} onQuery={setQuery} onScan={onScan} scanning={scanning} />
          {!isTauri() && (
            <div className="mb-4 border border-warning/40 bg-warning/5 px-3 py-2 text-warning text-xs">
              {"> preview en navegador · datos DEMO (el backend real solo corre en la app nativa)"}
            </div>
          )}

          {section === "matrix" && <McpMatrix query={query} />}
          {section === "agents" && <AgentsPanel />}
          {section === "secrets" && <SecretsPanel />}
          {section === "sync" && <SyncPanel />}
        </div>
      </main>
    </div>
  );
}
