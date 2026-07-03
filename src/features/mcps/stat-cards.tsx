import { Card } from "@/components/ui/card";
import { Bot, List, TriangleAlert, Unplug } from "lucide-react";

interface Stat {
  label: string;
  value: number;
  icon: typeof Bot;
  tone?: "warning" | "danger";
}

export function StatCards({
  agents,
  mcps,
  differs,
  errors,
}: {
  agents: number;
  mcps: number;
  differs: number;
  errors: number;
}) {
  const stats: Stat[] = [
    { label: "AGENTS", value: agents, icon: Bot },
    { label: "MCP SERVERS", value: mcps, icon: List },
    { label: "DIFFERS", value: differs, icon: Unplug, tone: "warning" },
    { label: "ERRORS", value: errors, icon: TriangleAlert, tone: "danger" },
  ];

  return (
    <div className="mb-[22px] grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, tone }) => {
        const toneClass =
          tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "";
        return (
          <Card key={label} className="p-4">
            <div className={`font-semibold text-[26px] leading-none ${toneClass}`}>{value}</div>
            <div className="mt-2 flex items-center gap-1.5">
              <Icon size={13} className={toneClass || "text-faint"} strokeWidth={2} />
              <span className="text-[10px] tracking-[0.12em] text-muted-foreground">{label}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
