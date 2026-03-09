"use client";
import { useState } from "react";
import { generateRecommendation } from "@/lib/decisionEngine";
import type { DecisionInputs, ArchRec, ConfidenceScore } from "@/lib/types";
import { ChevronRight, RefreshCw } from "lucide-react";

const CS: Record<ConfidenceScore,string> = { strong:"text-confirmed bg-confirmed/5 border-confirmed/20", moderate:"text-inferred bg-inferred/5 border-inferred/20", situational:"text-subtle bg-surface border-border" };
const SEV = { low:"bg-confirmed", medium:"bg-inferred", high:"bg-danger" };
const LIKE = { low:"text-confirmed border-confirmed/20 bg-confirmed/5", medium:"text-inferred border-inferred/20 bg-inferred/5", high:"text-danger border-danger/20 bg-danger/5" };
const LEVEL: Record<string,string> = { low:"text-confirmed border-confirmed/20 bg-confirmed/5", medium:"text-inferred border-inferred/20 bg-inferred/5", high:"text-danger border-danger/20 bg-danger/5", "sub-second":"text-confirmed border-confirmed/20 bg-confirmed/5", "1–3s":"text-inferred border-inferred/20 bg-inferred/5", "3–10s":"text-danger border-danger/20 bg-danger/5" };

function SelectGrid({ label, opts, value, onChange }: { label:string; opts:{value:string;label:string;hint?:string}[]; value:string; onChange:(v:string)=>void }) {
  return (
    <div>
      <div className="text-sm font-semibold text-text mb-2">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        {opts.map(o=>(
          <button key={o.value} onClick={()=>onChange(o.value)}
            className={`text-left p-3 rounded-2xl border transition-all duration-200 ${value===o.value?"border-accent bg-accent/10 text-text":"border-border bg-surface text-text-dim hover:border-accent/30 hover:text-text"}`}>
            <span className="text-sm font-medium block">{o.label}</span>
            {o.hint && <span className="text-xs text-subtle mt-0.5 block font-mono">{o.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function DecCard({ icon, d }: { icon:string; d:{ label:string; value:string; rationale:string; confidence:ConfidenceScore; alternatives?:string[] } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><span>{icon}</span><span className="section-label">{d.label}</span></div>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${CS[d.confidence]}`}>{d.confidence}</span>
      </div>
      <div className="font-display font-semibold text-text">{d.value}</div>
      <p className="text-xs text-text-dim leading-relaxed">{d.rationale}</p>
      {d.alternatives?.length && (
        <>
          <button onClick={()=>setOpen(!open)} className="text-xs text-accent font-mono flex items-center gap-1 hover:text-indigo-300 transition-colors">
            <ChevronRight size={12} className={`transition-transform ${open?"rotate-90":""}`}/>{open?"Hide":"See"} alternatives
          </button>
          {open && <div className="flex flex-wrap gap-1.5 pt-1">{d.alternatives.map((a,i)=><span key={i} className="text-xs font-mono text-text-dim bg-surface border border-border px-2 py-1 rounded-xl">{a}</span>)}</div>}
        </>
      )}
    </div>
  );
}

function ResultView({ rec, onReset, onReadPMQ }: { rec:ArchRec; onReset:()=>void; onReadPMQ:()=>void }) {
  return (
    <div className="space-y-4 animate-fade-up">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs font-mono text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full inline-block mb-2">Recommended Architecture</div>
            <h2 className="font-display text-2xl font-bold gradient-text">{rec.title}</h2>
            <p className="text-xs text-subtle font-mono mt-1">{rec.tagline}</p>
          </div>
          <button onClick={onReset} className="flex items-center gap-1.5 text-xs text-subtle hover:text-text border border-border hover:border-accent/30 rounded-xl px-3 py-2 transition-all font-mono">
            <RefreshCw size={12}/> New decision
          </button>
        </div>
        <p className="text-sm text-text-dim leading-relaxed mt-4 pt-4 border-t border-border">{rec.summary}</p>
        <div className="flex flex-wrap gap-3 mt-4">
          {([["Complexity",rec.complexity],["Cost",rec.costLevel],["Latency",rec.latencyClass]] as [string,string][]).map(([l,v])=>(
            <div key={l} className="flex items-center gap-1.5">
              <span className="text-xs text-subtle font-mono">{l}:</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${LEVEL[v]||"text-subtle border-border bg-surface"}`}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div><div className="section-label mb-3 px-1">Architecture Decisions</div>
        <div className="grid md:grid-cols-2 gap-3">
          <DecCard icon="⚙️" d={rec.pattern}/><DecCard icon="🧠" d={rec.modelClass}/>
          <DecCard icon="🗄️" d={rec.retrieval}/><DecCard icon="🛡️" d={rec.deployment}/>
          <DecCard icon="⚡" d={rec.optimization}/><DecCard icon="📊" d={rec.observability}/>
        </div>
      </div>

      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-4">Trade-offs</div>
        <div className="space-y-3">{rec.tradeoffs.map((t,i)=>(
          <div key={i} className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEV[t.severity]}`}/>
            <div><div className="text-sm text-confirmed font-medium">+ {t.gain}</div><div className="text-sm text-danger font-medium">− {t.cost}</div></div>
          </div>
        ))}</div>
      </div>

      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-4">Failure Modes</div>
        <div className="space-y-3">{rec.failureModes.map((f,i)=>(
          <div key={i} className="bg-surface border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <span className="text-sm font-semibold text-text">{f.name}</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${LIKE[f.likelihood]}`}>{f.likelihood} likelihood</span>
            </div>
            <p className="text-xs text-text-dim leading-relaxed"><span className="text-accent font-mono">Mitigation: </span>{f.mitigation}</p>
          </div>
        ))}</div>
      </div>

      {/* 30-day plan */}
      <div className="card p-6">
        <div className="section-label mb-1">If I were the PM</div>
        <h3 className="font-display text-2xl font-bold mb-1">What I&apos;d ship in <span className="accent-text">30 days.</span></h3>
        <p className="text-sm text-text-dim mb-6">Three initiatives ranked by architectural priority — tied directly to the decisions above.</p>
        <div className="space-y-4">{rec.thirtyDayPlan.map((action,i)=>(
          <div key={i} className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <span className="text-xs font-mono bg-accent/10 border border-accent/20 text-accent px-2 py-1 rounded-lg">{action.week}</span>
              <span className="text-xs font-mono text-subtle border border-border px-2 py-1 rounded-lg">{action.lever} lever</span>
            </div>
            <h4 className="font-display font-semibold text-text mb-2">{action.title}</h4>
            <p className="text-sm text-text-dim leading-relaxed mb-3">{action.description}</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2"><span className="text-xs font-mono text-subtle shrink-0 mt-0.5">Deliverable</span><span className="text-xs text-text-dim">{action.deliverable}</span></div>
              <div className="flex items-start gap-2"><span className="text-xs font-mono text-subtle shrink-0 mt-0.5">Success</span><span className="text-xs text-text-dim">{action.success}</span></div>
            </div>
          </div>
        ))}</div>
      </div>

      {/* PM Questions */}
      <div className="border border-accent/20 rounded-2xl p-6 bg-accent/5" onClick={onReadPMQ}>
        <div className="flex items-center gap-2 mb-4"><span className="text-accent">◆</span><span className="font-display font-semibold text-text">Questions Every PM Must Answer First</span></div>
        <ul className="space-y-3">{rec.pmQuestions.map((q,i)=>(
          <li key={i} className="flex items-start gap-3"><span className="text-accent text-xs font-mono shrink-0 mt-0.5">→</span><span className="text-sm text-text-dim leading-relaxed">{q}</span></li>
        ))}</ul>
      </div>
    </div>
  );
}

const DEFAULT: DecisionInputs = { useCase:"", latencyRequirement:"interactive", privacyRequirement:"medium", scaleLevel:"startup", budget:"medium", dataFreshness:"periodic", customization:"none", outputType:"text" };

interface ArchProps { onUsed?: () => void; onReadPMQ?: () => void }

export function ArchDecisionTool({ onUsed, onReadPMQ }: ArchProps) {
  const [inp, setInp] = useState<DecisionInputs>(DEFAULT);
  const [result, setResult] = useState<ArchRec|null>(null);
  const set = (k: keyof DecisionInputs) => (v:string) => setInp(p=>({...p,[k]:v}));

  if (result) return <ResultView rec={result} onReset={()=>setResult(null)} onReadPMQ={()=>onReadPMQ?.()} />;

  return (
    <div className="card p-6 space-y-6 animate-fade-in">
      <div>
        <div className="section-label mb-1">Architecture Decision Tool</div>
        <p className="text-sm text-text-dim">Input your constraints. Get architecture recommendation + failure modes + 30-day PM plan. Fully client-side, instant.</p>
      </div>
      <div>
        <div className="text-sm font-semibold text-text mb-2">Use Case</div>
        <input type="text" value={inp.useCase} onChange={e=>setInp(p=>({...p,useCase:e.target.value}))} placeholder="e.g. meeting summarization, voice assistant, code autocomplete…" className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-sm text-text placeholder-subtle outline-none focus:border-accent/50"/>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <SelectGrid label="Latency" value={inp.latencyRequirement} onChange={set("latencyRequirement")} opts={[{value:"real-time",label:"Real-time",hint:"< 500ms"},{value:"interactive",label:"Interactive",hint:"1–5s"},{value:"async",label:"Async",hint:"Minutes OK"}]}/>
        <SelectGrid label="Privacy" value={inp.privacyRequirement} onChange={set("privacyRequirement")} opts={[{value:"high",label:"High",hint:"No external APIs"},{value:"medium",label:"Medium",hint:"Managed cloud OK"},{value:"low",label:"Low",hint:"Public data"}]}/>
        <SelectGrid label="Scale" value={inp.scaleLevel} onChange={set("scaleLevel")} opts={[{value:"prototype",label:"Prototype",hint:"Testing idea"},{value:"startup",label:"Startup",hint:"< 10K users"},{value:"growth",label:"Growth",hint:"10K–1M"},{value:"enterprise",label:"Enterprise",hint:"1M+ / SLAs"}]}/>
        <SelectGrid label="Budget" value={inp.budget} onChange={set("budget")} opts={[{value:"low",label:"Low",hint:"< $500/mo"},{value:"medium",label:"Medium",hint:"$500–$5K/mo"},{value:"high",label:"High",hint:"$5K+/mo"}]}/>
        <SelectGrid label="Data Freshness" value={inp.dataFreshness} onChange={set("dataFreshness")} opts={[{value:"static",label:"Static",hint:"Index once"},{value:"periodic",label:"Periodic",hint:"Daily/weekly"},{value:"live",label:"Live",hint:"Real-time fetch"}]}/>
        <SelectGrid label="Customization" value={inp.customization} onChange={set("customization")} opts={[{value:"none",label:"None",hint:"Generic"},{value:"light",label:"Light",hint:"Prompt eng."},{value:"heavy",label:"Heavy",hint:"Fine-tuning"}]}/>
        <SelectGrid label="Output Type" value={inp.outputType} onChange={set("outputType")} opts={[{value:"text",label:"Text",hint:"Chat, summaries"},{value:"code",label:"Code",hint:"Generation"},{value:"structured",label:"Structured",hint:"JSON, tables"},{value:"multimodal",label:"Multimodal",hint:"Images, audio"}]}/>
      </div>
      <button onClick={()=>{ setResult(generateRecommendation(inp)); onUsed?.(); }} className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-dim text-white font-medium py-3.5 rounded-2xl transition-all shadow-glow-sm">
        Generate Architecture Recommendation <ChevronRight size={16}/>
      </button>
    </div>
  );
}
