"use client";
import { useState, useEffect } from "react";
import { runSimulator, FEATURE_TYPE_OPTIONS, DEFAULT_SIM } from "@/lib/simulator";
import type { SimInputs } from "@/lib/types";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

function FeatureTypeGrid({ value, onChange }: { value: SimInputs["featureType"]; onChange: (v: SimInputs["featureType"]) => void }) {
  return (
    <div>
      <div className="section-label mb-3">Feature Type</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FEATURE_TYPE_OPTIONS.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all duration-200 ${value===o.value?"border-accent bg-accent/10 text-text":"border-border bg-surface text-text-dim hover:border-accent/30 hover:text-text"}`}>
            <span className="text-lg">{o.emoji}</span>
            <span className="text-xs font-medium leading-tight">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Tabs({ label, opts, value, onChange, trackKey }: {
  label: string; opts: {value:string;label:string;hint?:string}[]; value: string; onChange:(v:string)=>void; trackKey?: string;
}) {
  return (
    <div>
      <div className="section-label mb-2">{label}</div>
      <div className="flex gap-1 p-1 bg-ink rounded-xl border border-border">
        {opts.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`flex-1 py-2 px-1 rounded-lg text-center transition-all duration-200 ${value===o.value?"bg-accent text-white shadow-glow-sm":""} ${value!==o.value?"text-subtle hover:text-text":""}`}>
            <div className="text-xs font-medium">{o.label}</div>
            {o.hint && <div className="text-xs opacity-60 font-mono hidden sm:block">{o.hint}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, unit, color, max }: { label:string; value:number; unit:string; color:string; max:number }) {
  return (
    <div className="card p-4">
      <div className="section-label mb-2">{label}</div>
      <div className="flex items-end gap-1 mb-2">
        <span className="text-2xl font-display font-bold" style={{color}}>{value}</span>
        <span className="text-sm text-subtle font-mono mb-0.5">{unit}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{width:`${Math.min(100,(value/max)*100)}%`,background:color}}/>
      </div>
    </div>
  );
}

function scoreColor(v: number) { return v >= 75 ? "#22C55E" : v >= 50 ? "#F59E0B" : "#EF4444"; }
function latColor(ms: number)  { return ms <= 1500 ? "#22C55E" : ms <= 4000 ? "#F59E0B" : "#EF4444"; }
function riskColor(r: number)  { return r <= 20 ? "#22C55E" : r <= 35 ? "#F59E0B" : "#EF4444"; }
function costColor(c: number)  { return c <= 10 ? "#22C55E" : c <= 30 ? "#F59E0B" : "#EF4444"; }

interface Props { onEngagement?: (k: string) => void }

export function AISystemSimulator({ onEngagement }: Props) {
  const [inp, setInp] = useState<SimInputs>(DEFAULT_SIM);
  const [changesCount, setChangesCount] = useState(0);

  const out = runSimulator(inp);

  const set = (k: keyof SimInputs) => (v: string) => {
    setInp(p => ({ ...p, [k]: v }));
    setChangesCount(c => c + 1);
    onEngagement?.(k);
  };

  useEffect(() => { onEngagement?.("featureType"); }, []);

  const radarData = [
    { subject:"Quality",    value: out.qualityScore },
    { subject:"Privacy",    value: out.privacyScore },
    { subject:"Reliability",value: Math.max(0, 100 - out.failureRisk) },
    { subject:"Cost eff.",  value: Math.max(0, 100 - out.costPer1k) },
    { subject:"Speed",      value: Math.max(0, 100 - (out.latencyMs / 180)) },
  ];

  return (
    <div className="space-y-6">
      {/* Feature type */}
      <FeatureTypeGrid value={inp.featureType} onChange={v => set("featureType")(v)} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: controls */}
        <div className="space-y-4">
          <Tabs label="Model Size" value={inp.modelSize} onChange={set("modelSize")}
            opts={[{value:"small",label:"Small",hint:"~7B"},{value:"medium",label:"Medium",hint:"~13B"},{value:"large",label:"Large",hint:"70B+"}]} />
          <Tabs label="Context Length" value={inp.contextLength} onChange={set("contextLength")}
            opts={[{value:"1k",label:"1K"},{value:"4k",label:"4K"},{value:"16k",label:"16K"},{value:"100k",label:"100K"}]} />
          <Tabs label="Deployment" value={inp.deployment} onChange={set("deployment")}
            opts={[{value:"on-device",label:"On-Device",hint:"private"},{value:"hybrid",label:"Hybrid",hint:"mixed"},{value:"cloud",label:"Cloud",hint:"managed"}]} />
          <Tabs label="Traffic Scale" value={inp.trafficScale} onChange={set("trafficScale")}
            opts={[{value:"prototype",label:"Prototype"},{value:"startup",label:"Startup"},{value:"growth",label:"Growth"},{value:"enterprise",label:"Enterprise"}]} />
          <div className="grid grid-cols-2 gap-4">
            <Tabs label="Latency Req." value={inp.latencyRequirement} onChange={set("latencyRequirement")}
              opts={[{value:"real-time",label:"Real-time"},{value:"interactive",label:"Interactive"},{value:"async",label:"Async"}]} />
            <Tabs label="Privacy Req." value={inp.privacyRequirement} onChange={set("privacyRequirement")}
              opts={[{value:"high",label:"High"},{value:"medium",label:"Med."},{value:"low",label:"Low"}]} />
          </div>
          <Tabs label="Optimization" value={inp.optimization} onChange={set("optimization")}
            opts={[{value:"none",label:"None"},{value:"basic",label:"Basic"},{value:"aggressive",label:"Aggressive"}]} />
        </div>

        {/* Right: outputs */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="LATENCY"      value={out.latencyMs}    unit="ms"   color={latColor(out.latencyMs)}   max={10000} />
            <Metric label="COST / 1K REQ" value={out.costPer1k}  unit="¢"    color={costColor(out.costPer1k)}  max={80} />
            <Metric label="QUALITY"       value={out.qualityScore} unit="/100" color={scoreColor(out.qualityScore)} max={100} />
            <Metric label="PRIVACY"       value={out.privacyScore} unit="/100" color={scoreColor(out.privacyScore)} max={100} />
            <Metric label="FAILURE RISK"  value={out.failureRisk}  unit="%"   color={riskColor(out.failureRisk)} max={80} />
            <Metric label="COMPUTE LOAD"  value={out.computeLoad}  unit="%"   color={scoreColor(100-out.computeLoad)} max={100} />
          </div>

          {/* Radar */}
          <div className="card p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{top:0,right:20,bottom:0,left:20}}>
                <PolarGrid stroke="#1A1A2E"/>
                <PolarAngleAxis dataKey="subject" tick={{fill:"#6666AA",fontSize:10,fontFamily:"JetBrains Mono"}}/>
                <Radar dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.15} strokeWidth={1.5}/>
                <Tooltip contentStyle={{background:"#11111E",border:"1px solid #1A1A2E",borderRadius:8,fontSize:12}} labelStyle={{color:"#EDEDF5"}} itemStyle={{color:"#6366F1"}}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {out.warnings.length > 0 && (
        <div className="space-y-2">
          {out.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-inferred bg-inferred/5 border border-inferred/20 rounded-xl px-3 py-2">
              <span>⚠</span><span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Insight */}
      <div className="border border-accent/20 rounded-2xl p-5 bg-accent/5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-accent text-sm">◆</span>
          <span className="section-label">System Insight</span>
        </div>
        <p className="text-sm text-text-dim leading-relaxed">{out.insight}</p>
      </div>

      {/* Recommended architecture */}
      <div className="card p-5">
        <div className="section-label mb-2">Recommended Architecture</div>
        <p className="text-sm text-text font-medium">{out.recommendedArchitecture}</p>
      </div>

      {/* 30-day plan */}
      <div className="card p-5">
        <div className="font-display font-semibold text-text mb-1">If I were the PM</div>
        <p className="text-xs text-subtle font-mono mb-4">What I&apos;d ship in <span className="accent-text font-semibold">30 days</span> given this configuration</p>
        <div className="space-y-3">
          {out.thirtyDayPlan.map((item, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-4" onClick={() => onEngagement?.("thirtyDayPlan")}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded-lg">{item.week}</span>
              </div>
              <p className="text-sm font-semibold text-text mb-1">{item.action}</p>
              <p className="text-xs text-text-dim leading-relaxed">{item.why}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
