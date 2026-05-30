import { useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import styles from "./Guide.module.css";

const DIFF_STYLE = {
  Easy:   { bg:"var(--color-background-success)", color:"var(--color-text-success)" },
  Medium: { bg:"var(--color-background-warning)", color:"var(--color-text-warning)" },
  Hard:   { bg:"var(--color-background-danger)",  color:"var(--color-text-danger)"  },
};

function PhaseProgress({ phase, checked }) {
  const items = phase.topics.flatMap(t => t.items);
  const done = items.filter(i => checked[i.id]).length;
  const total = items.length;
  const pct = total ? Math.round((done/total)*100) : 0;
  return (
    <div className={styles.progressWrapper}>
      <span className={styles.progressTextSmall}>{done}/{total}</span>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${pct}%`, background: phase.accent }} />
      </div>
    </div>
  );
}

function Item({ item, done, onToggle }) {
  const isLink = item.type === "problem" || item.type === "task";
  const url = item.type === "problem" ? `https://leetcode.com/problems/${item.slug}/` : null;
  return (
    <div 
      className={`${styles.itemContainer} ${done ? styles.done : ''}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(item.id); }}}
      onClick={() => onToggle(item.id)}
      role="checkbox"
      aria-checked={done}
      tabIndex={0}
    >
      <div className={`${styles.checkbox} ${done ? styles.done : styles.todo}`}>
        {done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="var(--color-background-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>}
      </div>
      {isLink ? (
        <div className={`${styles.linkContent} ${done ? styles.done : ''}`}>
          <span className={styles.itemNum}>#{item.num}</span>
          <span className={styles.itemTitle}>{item.title}</span>
          <span className={styles.itemDiff} style={{
            background: DIFF_STYLE[item.difficulty].bg,
            color: DIFF_STYLE[item.difficulty].color,
          }}>{item.difficulty}</span>
          {url && (
            <a href={url} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className={styles.itemUrl}>
              <i className="ti ti-external-link" style={{fontSize:11}} aria-hidden="true"/>
            </a>
          )}
        </div>
      ) : (
        <span className={`${styles.textContent} ${done ? styles.done : styles.todo}`}>
          {item.text}
        </span>
      )}
    </div>
  );
}

function Topic({ topic, checked, expanded, onToggle, onToggleItem }) {
  const items = topic.items;
  const done = items.filter(i => checked[i.id]).length;
  const total = items.length;
  const isOpen = !!expanded[topic.id];

  return (
    <div className={styles.topicContainer}>
      <div
        onClick={() => onToggle(topic.id)}
        className={`${styles.topicHeader} ${isOpen ? styles.open : ''}`}
      >
        <i className={`ti ti-chevron-down ${styles.chevron} ${isOpen ? styles.open : styles.closed}`} aria-hidden="true"/>
        <span className={styles.topicTitle}>{topic.title}</span>
        <span className={styles.topicProgress}>{done}/{total}</span>
      </div>
      {isOpen && (
        <div>
          {items.map(item => (
            <Item key={item.id} item={item} done={!!checked[item.id]} onToggle={onToggleItem}/>
          ))}
        </div>
      )}
    </div>
  );
}

function Phase({ phase, checked, expandedPhases, expandedTopics, onTogglePhase, onToggleTopic, onToggleItem }) {
  const isOpen = !!expandedPhases[phase.id];
  return (
    <div className={styles.phaseContainer}>
      <div
        onClick={() => onTogglePhase(phase.id)}
        className={styles.phaseHeader}
        style={{ borderLeft: `3px solid ${phase.accent}` }}
      >
        <span className={styles.phaseBadge} style={{
          background: phase.accent + "22",
          color: phase.accent,
        }}>P{phase.phase}</span>
        <div className={styles.phaseTitleContainer}>
          <div className={styles.phaseTitle}>{phase.title}</div>
          {isOpen && <div className={styles.phaseSubtitle}>{phase.subtitle}</div>}
        </div>
        <PhaseProgress phase={phase} checked={checked}/>
        <i className={`ti ti-chevron-down ${styles.chevron} ${isOpen ? styles.open : styles.closed}`} aria-hidden="true"/>
      </div>
      {isOpen && (
        <div className={styles.phaseContent}>
          {phase.topics.map(topic => (
            <Topic
              key={topic.id} topic={topic} checked={checked}
              expanded={expandedTopics}
              onToggle={onToggleTopic}
              onToggleItem={onToggleItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Guide({ config }) {
  const {
    curriculum, storageKey, title, subtitle,
    taskLabel, taskColor,
    showLeetCodeLegend, showDiffLegend,
  } = config;

  const [storedData, setStoredData] = useLocalStorage(storageKey, {
    c: {},
    ep: { [curriculum[0].id]: true },
    et: curriculum[0].topics.reduce((acc, t) => ({ ...acc, [t.id]: true }), {})
  });

  const checked = storedData.c || {};
  const expandedPhases = storedData.ep || {};
  const expandedTopics = storedData.et || {};

  const [filter, setFilter] = useState("all");
  const [showReset, setShowReset] = useState(false);

  const persist = (c, ep, et) => setStoredData({ c, ep, et });

  const handleToggleItem = (id) => {
    persist({ ...checked, [id]: !checked[id] }, expandedPhases, expandedTopics);
  };
  const handleTogglePhase = (id) => {
    persist(checked, { ...expandedPhases, [id]: !expandedPhases[id] }, expandedTopics);
  };
  const handleToggleTopic = (id) => {
    persist(checked, expandedPhases, { ...expandedTopics, [id]: !expandedTopics[id] });
  };
  const handleReset = () => {
    persist({}, expandedPhases, expandedTopics);
    setShowReset(false);
  };

  const allItems = curriculum.flatMap(p => p.topics.flatMap(t => t.items));
  const total = allItems.length;
  const done  = allItems.filter(i => checked[i.id]).length;
  const pct   = total ? Math.round((done/total)*100) : 0;

  const taskType = taskLabel === "LeetCode" ? "problem" : "task";
  const taskItems = allItems.filter(i => i.type === taskType);
  const taskDone  = taskItems.filter(i => checked[i.id]).length;
  const concepts   = allItems.filter(i => i.type === "concept");
  const concDone   = concepts.filter(i => checked[i.id]).length;

  const visibleCurriculum = filter === "all" ? curriculum : curriculum.map(p => ({
    ...p,
    topics: p.topics.map(t => ({
      ...t,
      items: t.items.filter(i => filter==="todo" ? !checked[i.id] : !!checked[i.id])
    })).filter(t => t.items.length > 0)
  })).filter(p => p.topics.length > 0);

  return (
    <div className={styles.container}>
      <h2 className="sr-only">{title}</h2>

      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <span className={styles.title}>{title}</span>
            <span className={styles.subtitle}>{subtitle}</span>
          </div>
          <span className={styles.progressText}>{pct}% complete</span>
        </div>

        <div className={styles.progressBarContainer}>
          <div className={styles.progressBar} style={{ width: `${pct}%`, background: "linear-gradient(90deg,#0F6E56,#185FA5)" }}/>
        </div>

        <div className={styles.statsRow}>
          {[
            {label:"Total",     val:`${done}/${total}`,      color:"var(--color-text-primary)"},
            {label:taskLabel,   val:`${taskDone}/${taskItems.length}`,   color:taskColor},
            {label:"Concepts",  val:`${concDone}/${concepts.length}`,color:"var(--color-text-info)"},
          ].map(s => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statValue} style={{ color: s.color }}>{s.val}</span>
            </div>
          ))}
          <button onClick={() => setShowReset(!showReset)} className={styles.resetButton} aria-label="Reset progress">
            <i className="ti ti-refresh" aria-hidden="true" style={{fontSize:13}}/>
          </button>
        </div>

        {showReset && (
          <div className={styles.resetAlert}>
            <span className={styles.resetText}>Reset all progress? This cannot be undone.</span>
            <button onClick={handleReset} className={styles.resetConfirmBtn}>Reset</button>
            <button onClick={()=>setShowReset(false)} className={styles.resetCancelBtn}>Cancel</button>
          </div>
        )}

        <div className={styles.filterRow}>
          {[
            {key:"all",   label:"All"},
            {key:"todo",  label:"To Do"},
            {key:"done",  label:"Completed"},
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} 
              className={`${styles.filterBtn} ${filter === f.key ? styles.active : ''}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.legendRow}>
        {[
          {icon:"ti-book",    label:"Concept to learn", color:"var(--color-text-secondary)"},
          {icon:"ti-code",    label: showLeetCodeLegend ? "LeetCode problem" : "Task to build",  color:"var(--color-text-secondary)"},
        ].map(l => (
          <div key={l.label} className={styles.legendItem}>
            <i className={`ti ${l.icon} ${styles.legendIcon}`} style={{color:l.color}} aria-hidden="true"/>
            <span className={styles.legendText}>{l.label}</span>
          </div>
        ))}
        {showDiffLegend && (
          <div className={styles.diffLegend}>
            {["Easy","Medium","Hard"].map(d => (
              <span key={d} className={styles.diffBadge} style={{
                background: DIFF_STYLE[d].bg, color: DIFF_STYLE[d].color
              }}>{d}</span>
            ))}
          </div>
        )}
      </div>

      <div>
        {visibleCurriculum.length === 0 ? (
          <div className={styles.emptyState}>
            {filter==="done" ? "Nothing completed yet — keep going!" : "All done! 🎉"}
          </div>
        ) : visibleCurriculum.map(phase => (
          <Phase
            key={phase.id}
            phase={phase}
            checked={checked}
            expandedPhases={expandedPhases}
            expandedTopics={expandedTopics}
            onTogglePhase={handleTogglePhase}
            onToggleTopic={handleToggleTopic}
            onToggleItem={handleToggleItem}
          />
        ))}
      </div>

      <div className={styles.footer}>
        Progress is saved automatically · Click any item to mark it done
      </div>
    </div>
  );
}
