import { useState } from "react";

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
    <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}>
      <span style={{fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap"}}>{done}/{total}</span>
      <div style={{width:60,height:4,borderRadius:2,background:"var(--color-border-tertiary)",overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:phase.accent,borderRadius:2,transition:"width 0.3s"}}/>
      </div>
    </div>
  );
}

function Item({ item, done, onToggle }) {
  const isLink = item.type === "problem" || item.type === "task";
  const url = item.type === "problem" ? `https://leetcode.com/problems/${item.slug}/` : null;
  return (
    <div style={{
      display:"flex",alignItems:"flex-start",gap:10,
      padding:"7px 16px",cursor:"pointer",
      background: done ? "var(--color-background-secondary)" : "transparent",
      transition:"background 0.15s",
    }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(item.id); }}}
      onClick={() => onToggle(item.id)}
      role="checkbox"
      aria-checked={done}
      tabIndex={0}
    >
      <div style={{
        width:16,height:16,borderRadius:3,flexShrink:0,marginTop:2,
        border:`1.5px solid ${done ? "var(--color-border-primary)" : "var(--color-border-secondary)"}`,
        background: done ? "var(--color-text-secondary)" : "transparent",
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"all 0.15s",
      }}>
        {done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="var(--color-background-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>}
      </div>
      {isLink ? (
        <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap",flex:1,opacity:done?0.5:1}}>
          <span style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--color-text-tertiary)",flexShrink:0}}>#{item.num}</span>
          <span style={{fontSize:13,color:"var(--color-text-primary)",fontWeight:400}}>{item.title}</span>
          <span style={{
            fontSize:10,fontWeight:500,padding:"1px 6px",borderRadius:3,flexShrink:0,
            background:DIFF_STYLE[item.difficulty].bg,
            color:DIFF_STYLE[item.difficulty].color,
          }}>{item.difficulty}</span>
          {url && (
            <a href={url} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{fontSize:11,color:"var(--color-text-info)",textDecoration:"none",flexShrink:0,display:"flex",alignItems:"center",gap:2}}>
              <i className="ti ti-external-link" style={{fontSize:11}} aria-hidden="true"/>
            </a>
          )}
        </div>
      ) : (
        <span style={{fontSize:13,color:done?"var(--color-text-tertiary)":"var(--color-text-primary)",lineHeight:1.5,flex:1,opacity:done?0.5:1}}>
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
    <div style={{borderTop:"0.5px solid var(--color-border-tertiary)"}}>
      <div
        onClick={() => onToggle(topic.id)}
        style={{
          display:"flex",alignItems:"center",gap:8,
          padding:"8px 16px",cursor:"pointer",
          background: isOpen ? "var(--color-background-secondary)" : "transparent",
        }}
      >
        <i className="ti ti-chevron-down" aria-hidden="true" style={{
          fontSize:13,color:"var(--color-text-tertiary)",
          transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
          transition:"transform 0.2s",
        }}/>
        <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{topic.title}</span>
        <span style={{fontSize:11,color:"var(--color-text-tertiary)",marginLeft:"auto"}}>
          {done}/{total}
        </span>
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
    <div style={{
      borderRadius:"var(--border-radius-lg)",
      border:"0.5px solid var(--color-border-tertiary)",
      overflow:"hidden",
      marginBottom:8,
    }}>
      <div
        onClick={() => onTogglePhase(phase.id)}
        style={{
          display:"flex",alignItems:"center",gap:10,
          padding:"12px 16px",cursor:"pointer",
          background:"var(--color-background-secondary)",
          borderLeft:`3px solid ${phase.accent}`,
        }}
      >
        <span style={{
          fontSize:11,fontWeight:500,padding:"2px 7px",borderRadius:3,
          background: phase.accent + "22",
          color: phase.accent,
          flexShrink:0,
          fontFamily:"var(--font-mono)",
        }}>P{phase.phase}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{phase.title}</div>
          {isOpen && <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:1}}>{phase.subtitle}</div>}
        </div>
        <PhaseProgress phase={phase} checked={checked}/>
        <i className="ti ti-chevron-down" aria-hidden="true" style={{
          fontSize:14,color:"var(--color-text-tertiary)",flexShrink:0,
          transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
          transition:"transform 0.2s",
        }}/>
      </div>
      {isOpen && (
        <div style={{background:"var(--color-background-primary)"}}>
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

export default function Guide({
  curriculum, storageKey, title, subtitle,
  taskLabel, taskColor,
  showLeetCodeLegend, showDiffLegend,
}) {
  const [checked, setChecked]           = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.c || {}; } catch { return {}; }
  });
  const [expandedPhases, setEP]         = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.ep || {[curriculum[0].id]: true}; } catch { return {[curriculum[0].id]: true}; }
  });
  const [expandedTopics, setET]         = useState(() => {
    const first = curriculum[0].topics;
    const defaults = {};
    first.forEach(t => { defaults[t.id] = true; });
    try { return JSON.parse(localStorage.getItem(storageKey))?.et || defaults; } catch { return defaults; }
  });
  const [filter, setFilter]             = useState("all");
  const [showReset, setShowReset]       = useState(false);

  const persist = (c, ep, et) => {
    try { localStorage.setItem(storageKey, JSON.stringify({ c, ep, et })); } catch { /* quota exceeded */ }
  };

  const handleToggleItem = (id) => {
    const nc = { ...checked, [id]: !checked[id] };
    setChecked(nc);
    persist(nc, expandedPhases, expandedTopics);
  };
  const handleTogglePhase = (id) => {
    const nep = { ...expandedPhases, [id]: !expandedPhases[id] };
    setEP(nep);
    persist(checked, nep, expandedTopics);
  };
  const handleToggleTopic = (id) => {
    const net = { ...expandedTopics, [id]: !expandedTopics[id] };
    setET(net);
    persist(checked, expandedPhases, net);
  };
  const handleReset = () => {
    setChecked({});
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
    <div style={{padding:"1rem 0",maxWidth:720,margin:"0 auto"}}>
      <h2 className="sr-only">{title}</h2>

      <div style={{marginBottom:"1.5rem",padding:"0 4px"}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:4}}>
          <div>
            <span style={{fontSize:20,fontWeight:500,color:"var(--color-text-primary)"}}>{title}</span>
            <span style={{fontSize:13,color:"var(--color-text-secondary)",marginLeft:10}}>{subtitle}</span>
          </div>
          <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{pct}% complete</span>
        </div>

        <div style={{height:6,borderRadius:3,background:"var(--color-border-tertiary)",overflow:"hidden",marginBottom:12}}>
          <div style={{
            width:`${pct}%`,height:"100%",borderRadius:3,
            background:"linear-gradient(90deg,#0F6E56,#185FA5)",
            transition:"width 0.4s ease",
          }}/>
        </div>

        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
          {[
            {label:"Total",     val:`${done}/${total}`,      color:"var(--color-text-primary)"},
            {label:taskLabel,   val:`${taskDone}/${taskItems.length}`,   color:taskColor},
            {label:"Concepts",  val:`${concDone}/${concepts.length}`,color:"var(--color-text-info)"},
          ].map(s => (
            <div key={s.label} style={{
              background:"var(--color-background-secondary)",
              borderRadius:"var(--border-radius-md)",
              border:"0.5px solid var(--color-border-tertiary)",
              padding:"6px 14px",display:"flex",gap:6,alignItems:"baseline",
            }}>
              <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{s.label}</span>
              <span style={{fontSize:14,fontWeight:500,color:s.color,fontFamily:"var(--font-mono)"}}>{s.val}</span>
            </div>
          ))}
          <button onClick={() => setShowReset(!showReset)} style={{
            marginLeft:"auto",fontSize:11,color:"var(--color-text-tertiary)",
            background:"transparent",border:"none",cursor:"pointer",padding:"6px 8px",
          }} aria-label="Reset progress">
            <i className="ti ti-refresh" aria-hidden="true" style={{fontSize:13}}/>
          </button>
        </div>

        {showReset && (
          <div style={{
            padding:12,borderRadius:"var(--border-radius-md)",
            background:"var(--color-background-danger)",
            border:"0.5px solid var(--color-border-danger)",
            display:"flex",alignItems:"center",gap:12,marginBottom:12,
          }}>
            <span style={{fontSize:13,color:"var(--color-text-danger)",flex:1}}>Reset all progress? This cannot be undone.</span>
            <button onClick={handleReset} style={{
              fontSize:12,padding:"4px 12px",borderRadius:4,
              background:"var(--color-background-danger)",
              color:"var(--color-text-danger)",
              border:"0.5px solid var(--color-border-danger)",cursor:"pointer",fontWeight:500,
            }}>Reset</button>
            <button onClick={()=>setShowReset(false)} style={{
              fontSize:12,padding:"4px 12px",borderRadius:4,
              background:"var(--color-background-secondary)",
              color:"var(--color-text-secondary)",
              border:"0.5px solid var(--color-border-tertiary)",cursor:"pointer",
            }}>Cancel</button>
          </div>
        )}

        <div style={{display:"flex",gap:6}}>
          {[
            {key:"all",   label:"All"},
            {key:"todo",  label:"To Do"},
            {key:"done",  label:"Completed"},
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              fontSize:12,padding:"5px 14px",borderRadius:"var(--border-radius-md)",cursor:"pointer",
              border: filter===f.key ? "0.5px solid var(--color-border-primary)" : "0.5px solid var(--color-border-tertiary)",
              background: filter===f.key ? "var(--color-background-primary)" : "transparent",
              color: filter===f.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              fontWeight: filter===f.key ? 500 : 400,
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:16,marginBottom:12,padding:"0 4px"}}>
        {[
          {icon:"ti-book",    label:"Concept to learn", color:"var(--color-text-secondary)"},
          {icon:"ti-code",    label: showLeetCodeLegend ? "LeetCode problem" : "Task to build",  color:"var(--color-text-secondary)"},
        ].map(l => (
          <div key={l.label} style={{display:"flex",alignItems:"center",gap:4}}>
            <i className={`ti ${l.icon}`} style={{fontSize:12,color:l.color}} aria-hidden="true"/>
            <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{l.label}</span>
          </div>
        ))}
        {showDiffLegend && (
          <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
            {["Easy","Medium","Hard"].map(d => (
              <span key={d} style={{
                fontSize:10,padding:"1px 6px",borderRadius:3,
                background:DIFF_STYLE[d].bg,color:DIFF_STYLE[d].color,fontWeight:500,
              }}>{d}</span>
            ))}
          </div>
        )}
      </div>

      <div>
        {visibleCurriculum.length === 0 ? (
          <div style={{textAlign:"center",padding:"2rem",color:"var(--color-text-secondary)",fontSize:14}}>
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

      <div style={{marginTop:16,textAlign:"center",fontSize:11,color:"var(--color-text-tertiary)"}}>
        Progress is saved automatically · Click any item to mark it done
      </div>
    </div>
  );
}
