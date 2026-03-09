import type { SimInputs, SimOutputs, FeatureType } from "./types";

// ── Base profiles per feature type ───────────────────────────────────────────
const FEATURE_BASE: Record<FeatureType, { latency: number; quality: number; cost: number; privacy: number; compute: number }> = {
  "meeting-summarization": { latency: 3200, quality: 78, cost: 8,  privacy: 72, compute: 55 },
  "voice-assistant":       { latency: 800,  quality: 82, cost: 12, privacy: 60, compute: 70 },
  "code-generation":       { latency: 2100, quality: 80, cost: 15, privacy: 65, compute: 65 },
  "search-qa":             { latency: 1400, quality: 76, cost: 6,  privacy: 75, compute: 45 },
  "image-generation":      { latency: 4500, quality: 85, cost: 25, privacy: 70, compute: 85 },
  "content-rewrite":       { latency: 1800, quality: 81, cost: 7,  privacy: 78, compute: 40 },
  "recommendation":        { latency: 600,  quality: 74, cost: 4,  privacy: 55, compute: 35 },
  "custom":                { latency: 2000, quality: 75, cost: 10, privacy: 68, compute: 50 },
};

// ── Deltas ────────────────────────────────────────────────────────────────────
const MODEL_DELTA: Record<SimInputs["modelSize"], { latency: number; quality: number; cost: number; compute: number }> = {
  small:  { latency: -800,  quality: -12, cost: -6,  compute: -20 },
  medium: { latency: 0,     quality: 0,   cost: 0,   compute: 0   },
  large:  { latency: 1600,  quality: 14,  cost: 18,  compute: 25  },
};
const CTX_DELTA: Record<SimInputs["contextLength"], { latency: number; quality: number; cost: number }> = {
  "1k":   { latency: -600,  quality: -8,  cost: -4  },
  "4k":   { latency: 0,     quality: 0,   cost: 0   },
  "16k":  { latency: 1800,  quality: 8,   cost: 12  },
  "100k": { latency: 5200,  quality: 12,  cost: 35  },
};
const DEPLOY_DELTA: Record<SimInputs["deployment"], { latency: number; quality: number; cost: number; privacy: number; compute: number }> = {
  "on-device": { latency: -400,  quality: -10, cost: -8,  privacy: 25,  compute: 20  },
  "hybrid":    { latency: 200,   quality: 4,   cost: 3,   privacy: 8,   compute: 5   },
  "cloud":     { latency: 600,   quality: 8,   cost: 12,  privacy: -15, compute: -10 },
};
const SCALE_DELTA: Record<SimInputs["trafficScale"], { latency: number; cost: number; compute: number; failureRisk: number }> = {
  prototype:  { latency: 0,    cost: 0,   compute: 0,  failureRisk: 10 },
  startup:    { latency: 100,  cost: 5,   compute: 5,  failureRisk: 18 },
  growth:     { latency: 300,  cost: 15,  compute: 15, failureRisk: 28 },
  enterprise: { latency: 600,  cost: 30,  compute: 30, failureRisk: 40 },
};
const OPT_DELTA: Record<SimInputs["optimization"], { latency: number; quality: number; cost: number }> = {
  none:       { latency: 0,     quality: 0,  cost: 0   },
  basic:      { latency: -400,  quality: -1, cost: -8  },
  aggressive: { latency: -1100, quality: -5, cost: -20 },
};
const LATENCY_REQ_DELTA: Record<SimInputs["latencyRequirement"], { latency: number }> = {
  "real-time":   { latency: -300 },
  "interactive": { latency: 0   },
  "async":       { latency: 400 },
};

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

// ── Insight generator ─────────────────────────────────────────────────────────
function generateInsight(out: { latencyMs: number; qualityScore: number; privacyScore: number; costPer1k: number; failureRisk: number }, inp: SimInputs): string {
  const { latencyMs, qualityScore, privacyScore, costPer1k, failureRisk } = out;

  if (inp.featureType === "voice-assistant" && latencyMs > 1500)
    return "Voice interfaces require sub-1.5s response for conversational trust. Beyond this threshold users perceive the AI as 'slow' and engagement drops sharply. Streaming partial responses is the primary mitigation.";
  if (inp.featureType === "meeting-summarization" && inp.contextLength === "100k" && latencyMs > 8000)
    return "100K context improves coverage of long meetings but pushes latency well past the typical async tolerance. Chunked processing with a local summary merge step recovers most quality at 60% lower latency.";
  if (inp.deployment === "on-device" && qualityScore < 68)
    return "On-device execution gives excellent privacy but the model size constraint is visibly hurting output quality. A hybrid approach — on-device for common patterns, cloud for edge cases — recovers most quality while preserving the privacy promise.";
  if (failureRisk > 35 && inp.trafficScale === "enterprise")
    return "At enterprise scale this configuration carries significant failure risk. The primary mitigations are circuit breakers, graceful degradation to cached results, and per-user token quotas before the cost compounds.";
  if (costPer1k > 30 && inp.trafficScale !== "prototype")
    return "Cost at this configuration will compound aggressively at scale. Semantic caching (GPTCache or Redis + embeddings) typically reduces spend 30–50% by serving repeated queries without LLM calls.";
  if (privacyScore < 45)
    return "Privacy score is low — this configuration sends sensitive data to external APIs. If the use case involves PII or confidential documents, on-device or self-hosted deployment is not optional.";
  if (qualityScore > 88 && latencyMs < 2000)
    return "Strong configuration — high quality within an acceptable latency window. The main risk at scale is cost. Evaluate if a smaller model captures 90% of the quality at 40% of the cost before committing.";

  return `This configuration achieves ${qualityScore > 80 ? "strong" : qualityScore > 70 ? "acceptable" : "below-threshold"} quality at ${latencyMs < 1500 ? "fast" : latencyMs < 3500 ? "moderate" : "slow"} latency. ${privacyScore > 75 ? "Privacy is well protected." : "Privacy could be improved by shifting toward on-device inference."} ${costPer1k > 20 ? "Cost warrants monitoring at scale." : "Cost is manageable."}`;
}

// ── Architecture recommendation ───────────────────────────────────────────────
function recommendArch(inp: SimInputs): string {
  if (inp.privacyRequirement === "high" && inp.deployment !== "on-device")
    return "Private RAG — self-hosted LLM + on-premise vector DB. No data leaves your infrastructure.";
  if (inp.featureType === "voice-assistant" && inp.latencyRequirement === "real-time")
    return "Streaming pipeline — small wake-word model on-device, cloud LLM with token streaming, sub-500ms first token target.";
  if (inp.featureType === "meeting-summarization" && inp.contextLength === "100k")
    return "Chunked summarization — split transcript into segments, summarize each locally, merge with a lightweight LLM pass. 60% faster than single-pass 100K context.";
  if (inp.deployment === "on-device")
    return "On-device SLM — quantized model (INT4/INT8), NPU-optimized inference, cloud fallback for complex queries.";
  if (inp.trafficScale === "enterprise")
    return "Hybrid RAG at scale — semantic cache layer, model routing (small/large), async batch processing for non-real-time queries.";
  return "Cloud RAG — managed LLM endpoint + vector DB (Pinecone/Supabase), semantic caching, streaming responses.";
}

// ── 30-day plan ───────────────────────────────────────────────────────────────
function generate30Day(inp: SimInputs, latencyMs: number, costPer1k: number, failureRisk: number): { week: string; action: string; why: string }[] {
  const plan: { week: string; action: string; why: string }[] = [];

  plan.push({ week: "Week 1–2", action: "Define your quality bar with a 30-example golden dataset", why: "You cannot optimize what you cannot measure. Build this before writing any production code." });

  if (latencyMs > 3000)
    plan.push({ week: "Week 2–3", action: "Add streaming responses and measure P50/P95 latency under load", why: `Current config at ${latencyMs}ms will feel slow. Streaming makes the first token appear in <500ms regardless of total generation time.` });
  else if (costPer1k > 20)
    plan.push({ week: "Week 2–3", action: "Implement semantic caching for repeated queries", why: `At $${(costPer1k/100).toFixed(2)}/request, scale will be expensive. Semantic caching typically reduces LLM calls by 30–50%.` });
  else
    plan.push({ week: "Week 2–3", action: "Optimize retrieval chunk size with experiments on your golden dataset", why: "The right chunk size alone improves retrieval precision 15–30% without touching the model." });

  if (failureRisk > 30)
    plan.push({ week: "Week 3–4", action: "Add circuit breakers and graceful degradation before any production traffic", why: `Failure risk is elevated at ${inp.trafficScale} scale. Users should never see a raw error — always a degraded-but-working response.` });
  else
    plan.push({ week: "Week 3–4", action: "Wire up Langfuse observability and define hallucination alert thresholds", why: "You can't manage quality reactively. Every LLM call should be traced, searchable, and alertable before you scale." });

  return plan;
}

// ── Main export ───────────────────────────────────────────────────────────────
export function runSimulator(inp: SimInputs): SimOutputs {
  const base = { ...FEATURE_BASE[inp.featureType] };

  let latency   = base.latency;
  let quality   = base.quality;
  let cost      = base.cost;
  let privacy   = base.privacy;
  let compute   = base.compute;
  let failRisk  = SCALE_DELTA[inp.trafficScale].failureRisk;

  const m = MODEL_DELTA[inp.modelSize];
  const c = CTX_DELTA[inp.contextLength];
  const d = DEPLOY_DELTA[inp.deployment];
  const s = SCALE_DELTA[inp.trafficScale];
  const o = OPT_DELTA[inp.optimization];
  const l = LATENCY_REQ_DELTA[inp.latencyRequirement];

  latency  += m.latency + c.latency + d.latency + s.latency + o.latency + l.latency;
  quality  += m.quality + c.quality + d.quality + o.quality;
  cost     += m.cost + c.cost + d.cost + s.cost + o.cost;
  privacy  += d.privacy;
  compute  += m.compute + d.compute + s.compute;

  // Privacy requirement adjustment
  if (inp.privacyRequirement === "high"  && privacy < 70) failRisk += 10;
  if (inp.privacyRequirement === "high"  && inp.deployment === "cloud") privacy -= 10;
  if (inp.latencyRequirement === "real-time" && latency > 2000) failRisk += 8;

  const latencyMs     = clamp(Math.round(latency), 150, 18000);
  const qualityScore  = clamp(Math.round(quality), 20, 98);
  const costPer1k     = clamp(parseFloat(cost.toFixed(1)), 0.5, 120);
  const privacyScore  = clamp(Math.round(privacy), 10, 100);
  const computeLoad   = clamp(Math.round(compute), 10, 100);
  const failureRisk   = clamp(Math.round(failRisk), 5, 80);

  const outputs = { latencyMs, qualityScore, costPer1k, privacyScore, computeLoad, failureRisk };

  return {
    ...outputs,
    insight: generateInsight(outputs, inp),
    warnings: buildWarnings(outputs, inp),
    recommendedArchitecture: recommendArch(inp),
    thirtyDayPlan: generate30Day(inp, latencyMs, costPer1k, failureRisk),
  };
}

function buildWarnings(out: { latencyMs: number; qualityScore: number; privacyScore: number; costPer1k: number; failureRisk: number }, inp: SimInputs): string[] {
  const w: string[] = [];
  if (inp.featureType === "voice-assistant" && out.latencyMs > 1500) w.push("Latency exceeds voice UX threshold of 1.5s");
  if (out.latencyMs > 5000) w.push("Latency > 5s — users will disengage in interactive flows");
  if (out.qualityScore < 65) w.push("Quality below acceptable threshold for production use");
  if (out.privacyScore < 45 && inp.privacyRequirement === "high") w.push("Privacy score conflicts with your privacy requirement");
  if (out.costPer1k > 40) w.push("Cost will compound aggressively at scale — add caching");
  if (out.failureRisk > 35) w.push("Elevated failure risk — add circuit breakers before production");
  return w;
}

export const FEATURE_TYPE_OPTIONS: { value: SimInputs["featureType"]; label: string; emoji: string }[] = [
  { value: "meeting-summarization", label: "Meeting Summarization", emoji: "🎙" },
  { value: "voice-assistant",       label: "Voice Assistant",       emoji: "🔊" },
  { value: "code-generation",       label: "Code Generation",       emoji: "💻" },
  { value: "search-qa",             label: "Search / Q&A",          emoji: "🔍" },
  { value: "image-generation",      label: "Image Generation",      emoji: "🎨" },
  { value: "content-rewrite",       label: "Content Rewrite",       emoji: "✏️" },
  { value: "recommendation",        label: "Recommendation",        emoji: "⭐" },
  { value: "custom",                label: "Custom Use Case",       emoji: "⚙️" },
];

export const DEFAULT_SIM: SimInputs = {
  featureType: "meeting-summarization",
  modelSize: "medium", contextLength: "4k", deployment: "cloud",
  trafficScale: "startup", latencyRequirement: "interactive",
  privacyRequirement: "medium", optimization: "basic",
};
