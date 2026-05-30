import { useLocalStorage } from "./hooks/useLocalStorage";
import Guide from "./Guide.jsx";
import DSA_CURRICULUM from "./curricula/dsa.js";
import EDGE_CURRICULUM from "./curricula/edge.js";
import styles from "./App.module.css";

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
  const [tab, setTab] = useLocalStorage("guide-active-tab", "dsa");
  const active = TABS.find(t => t.id === tab) || TABS[0];

  return (
    <div>
      <div className={styles.tabContainer}>
        {TABS.map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)} 
            className={`${styles.tab} ${tab === t.id ? styles.active : ''}`}
            style={{ borderBottomColor: tab === t.id ? t.curriculum[0].accent : 'transparent' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Guide key={active.id} config={active} />
    </div>
  );
}
