"use client";
import type { FeatureAnalysis } from "@/lib/types";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ExternalLink } from "lucide-react";

function FieldRow({ label, field }: { label:string; field:{value:string;confidence:string} }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-xs font-mono text-subtle w-36 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 flex items-start justify-between gap-3">
        <span className="text-sm text-text">{field.value}</span>
        <ConfidenceBadge level={field.confidence as "confirmed"|"inferred"|"unknown"}/>
      </div>
    </div>
  );
}
function Tags({ items }: { items:{value:string;confidence:string}[] }) {
  return <div className="flex flex-wrap gap-2">{items.map((item,i)=>(
    <div key={i} className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-1.5">
      <span className="text-sm text-text">{item.value}</span>
      <ConfidenceBadge level={item.confidence as "confirmed"|"inferred"|"unknown"}/>
    </div>
  ))}</div>;
}
const CONF_STYLE = { high:"text-confirmed border-confirmed/20 bg-confirmed/5", medium:"text-inferred border-inferred/20 bg-inferred/5", low:"text-subtle border-border bg-surface" };

export function FeatureDashboard({ data }: { data: FeatureAnalysis }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-2xl">{data.emoji||"🤖"}</div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-2xl font-bold gradient-text">{data.featureName}</h1>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${CONF_STYLE[data.overallConfidence]}`}>{data.overallConfidence} confidence</span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-text-dim text-sm">{data.company}</span>
                <span className="text-border">·</span>
                <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">{data.category}</span>
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-subtle font-mono">
            <div>Analyzed {new Date(data.generatedAt).toLocaleDateString()}</div>
            <div className="mt-0.5">{data.sources.length} sources retrieved</div>
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-border grid md:grid-cols-2 gap-5">
          <div><div className="section-label mb-2">User Problem</div><p className="text-sm text-text-dim leading-relaxed">{data.userProblem}</p></div>
          <div><div className="section-label mb-2">Summary</div><p className="text-sm text-text-dim leading-relaxed">{data.summary}</p></div>
        </div>
      </div>

      {/* Model */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-4">Model & Inference</div>
        <div className="divide-y divide-border">
          <FieldRow label="MODEL NAME"     field={data.model.name}/>
          <FieldRow label="PROVIDER"       field={data.model.provider}/>
          <FieldRow label="TYPE"           field={data.model.type}/>
          <FieldRow label="CONTEXT WINDOW" field={data.model.contextWindow}/>
          <FieldRow label="FINE-TUNED"     field={data.model.finetuned}/>
          <FieldRow label="DEPLOYMENT"     field={data.stack.deployment}/>
        </div>
      </div>

      {/* Performance */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-4">Performance</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {([["LATENCY",data.performance.latency],["QUALITY",data.performance.quality],["COST",data.performance.cost],["PRIVACY",data.performance.privacy],["RELIABILITY",data.performance.reliability]] as [string,{value:string;confidence:"confirmed"|"inferred"|"unknown"}][]).map(([label,field])=>(
            <div key={label} className="bg-surface rounded-2xl p-4 border border-border">
              <div className="section-label mb-2">{label}</div>
              <div className="text-sm font-semibold text-text">{field.value}</div>
              <div className="mt-2"><ConfidenceBadge level={field.confidence}/></div>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-5">System Stack</div>
        <div className="space-y-5">
          <div><div className="section-label mb-2">Hardware</div><Tags items={data.stack.hardware}/></div>
          <div><div className="section-label mb-2">Frameworks</div><Tags items={data.stack.frameworks}/></div>
          <div><div className="section-label mb-2">APIs</div><Tags items={data.stack.apis}/></div>
        </div>
      </div>

      {/* Tradeoffs */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-4">Trade-offs</div>
        <div className="space-y-3">
          {data.tradeoffs.map((t,i)=>(
            <div key={i} className="flex gap-3 p-3 rounded-2xl bg-surface border border-border">
              <div className="w-1 self-stretch rounded-full bg-accent shrink-0"/>
              <div>
                <div className="text-sm font-semibold text-text">{t.label}</div>
                <p className="text-xs text-text-dim mt-0.5 leading-relaxed">{t.description}</p>
                <span className="inline-block mt-1.5 text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">{t.dimension}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PM Insights */}
      <div className="border border-accent/20 rounded-2xl p-6 bg-accent/5">
        <div className="flex items-center gap-2 mb-4"><span className="text-accent">◆</span><span className="font-display font-semibold text-text">PM Insights</span></div>
        <ul className="space-y-3">
          {data.pmInsights.map((ins,i)=>(
            <li key={i} className="flex gap-3">
              <span className="text-accent font-mono text-sm shrink-0">0{i+1}</span>
              <p className="text-sm text-text-dim leading-relaxed">{ins}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Product impact */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-4">Product Impact</div>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          {([["USER SEGMENT",data.productImpact.userSegment],["ADOPTION SIGNAL",data.productImpact.adoptionSignal],["RETENTION IMPACT",data.productImpact.retentionImpact],["CHURN IMPACT",data.productImpact.churnImpact]] as [string,string][]).map(([l,v])=>(
            <div key={l} className="bg-surface border border-border rounded-2xl p-4"><div className="section-label mb-1">{l}</div><span className="text-sm text-text">{v}</span></div>
          ))}
        </div>
        {data.productImpact.successMetrics.length > 0 && (
          <div><div className="section-label mb-2">Success Metrics</div>
            <ul className="space-y-1">{data.productImpact.successMetrics.map((m,i)=><li key={i} className="flex items-center gap-2 text-sm text-text-dim"><span className="text-accent text-xs">→</span>{m}</li>)}</ul>
          </div>
        )}
      </div>

      {/* Sources */}
      <div className="card p-6">
        <div className="font-display font-semibold text-text mb-2">Sources</div>
        <p className="text-xs text-subtle font-mono mb-4">{data.sources.length} public sources. Confidence labels reflect confirmed vs inferred.</p>
        <div className="space-y-2">
          {data.sources.slice(0,8).map((s,i)=>(
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-surface border border-border rounded-2xl hover:border-accent/40 transition-colors group">
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full border shrink-0 ${s.type==="official"?"badge-confirmed":s.type==="article"?"badge-inferred":"badge-unknown"}`}>{s.type}</span>
              <span className="text-sm text-text-dim group-hover:text-text transition-colors flex-1 truncate">{s.title||s.url}</span>
              <ExternalLink size={12} className="text-subtle shrink-0"/>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
