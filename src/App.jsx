import { useState } from "react";
import Guide from "./Guide.jsx";
import DSA_CURRICULUM from "./curricula/dsa.js";
import EDGE_CURRICULUM from "./curricula/edge.js";

const TABS = [
  {
    id: "dsa",
    label: "DSA",
    curriculum: DSA_CURRICULUM,
    storageKey: "guide-dsa",
    title: "DSA Mastery Guide",
    subtitle: "C++ · Interview Prep Roadmap",
    taskLabel: "LeetCode",
    taskColor: "var(--color-text-warning)",
    showLeetCodeLegend: true,
    showDiffLegend: true,
  },
  {
    id: "edge",
    label: "Edge",
    curriculum: EDGE_CURRICULUM,
    storageKey: "guide-edge",
    title: "Edge Stack Mastery Guide",
    subtitle: "TypeScript · Open-Source Platforms Roadmap",
    taskLabel: "Tasks",
    taskColor: "var(--color-text-success)",
    showLeetCodeLegend: false,
    showDiffLegend: true,
  },
];

export default function App() {
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem("guide-active-tab") || "dsa"; } catch { return "dsa"; }
  });

  const handleTabChange = (id) => {
    setTab(id);
    try { localStorage.setItem("guide-active-tab", id); } catch { /* quota exceeded */ }
  };

  const active = TABS.find(t => t.id === tab);

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "center", gap: 0, padding: "1rem 0 0",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
            fontSize: 14, fontWeight: tab === t.id ? 500 : 400,
            padding: "8px 24px", cursor: "pointer",
            background: "transparent", border: "none",
            color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
            borderBottom: tab === t.id ? `2px solid ${t.curriculum[0].accent}` : "2px solid transparent",
            transition: "all 0.15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <Guide
        key={active.id}
        curriculum={active.curriculum}
        storageKey={active.storageKey}
        title={active.title}
        subtitle={active.subtitle}
        taskLabel={active.taskLabel}
        taskColor={active.taskColor}
        showLeetCodeLegend={active.showLeetCodeLegend}
        showDiffLegend={active.showDiffLegend}
      />
    </div>
  );
}
