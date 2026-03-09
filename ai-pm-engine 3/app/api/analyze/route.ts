import { NextRequest } from "next/server";
export const runtime = "edge";

const SYSTEM = `You are an expert AI systems analyst. Extract structured factual information about AI product features from provided web sources.

RULES:
1. Only use information from the provided sources — never hallucinate
2. Confidence: "confirmed" = explicitly stated | "inferred" = reasonably deduced | "unknown" = not mentioned
3. For unknown fields use value "Not publicly disclosed"
4. Return ONLY valid JSON — no markdown fences, no preamble, no explanation

Required JSON structure:
{
  "featureName": "string",
  "company": "string",
  "category": "Summarization|Conversational AI|Code Generation|Image Generation|Search|Writing Assistant|Voice|Vision|Recommendation|Other",
  "emoji": "single emoji",
  "tagline": "max 10 words",
  "userProblem": "1-2 sentences describing the user problem this solves",
  "summary": "2-3 sentences describing what the feature does and how",
  "overallConfidence": "high|medium|low",
  "model": {
    "name": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "provider": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "type": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "contextWindow": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "finetuned": { "value": "yes|no|unknown", "confidence": "confirmed|inferred|unknown" }
  },
  "performance": {
    "latency": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "quality": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "cost": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "privacy": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "reliability": { "value": "string", "confidence": "confirmed|inferred|unknown" }
  },
  "stack": {
    "hardware": [{ "value": "string", "confidence": "confirmed|inferred|unknown" }],
    "frameworks": [{ "value": "string", "confidence": "confirmed|inferred|unknown" }],
    "apis": [{ "value": "string", "confidence": "confirmed|inferred|unknown" }],
    "vectorDB": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "orchestration": { "value": "string", "confidence": "confirmed|inferred|unknown" },
    "deployment": { "value": "string", "confidence": "confirmed|inferred|unknown" }
  },
  "optimizations": ["string"],
  "tradeoffs": [{ "label": "string", "description": "string", "dimension": "quality-latency|privacy-accuracy|cost-scale|ondevice-cloud|general" }],
  "productImpact": {
    "adoptionSignal": "string",
    "retentionImpact": "string",
    "churnImpact": "string",
    "userSegment": "string",
    "successMetrics": ["string"]
  },
  "pmInsights": ["3-5 actionable PM insights grounded in the sources"],
  "sources": [{ "title": "string", "url": "string", "type": "official|article|analysis" }]
}`;

async function searchTavily(query: string, key: string) {
  const results: { title: string; url: string; content: string }[] = [];
  await Promise.all(
    [`${query} AI model architecture technical`, `${query} latency performance system design`, `${query} product trade-offs engineering`].map(async (q) => {
      try {
        const r = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: key, query: q, search_depth: "advanced", max_results: 3 }),
        });
        if (!r.ok) return;
        const d = await r.json();
        for (const x of (d.results ?? [])) {
          if (!results.find(e => e.url === x.url))
            results.push({ title: x.title ?? "", url: x.url ?? "", content: x.content ?? "" });
        }
      } catch { /* ignore */ }
    })
  );
  return results.slice(0, 8);
}

export async function POST(req: NextRequest) {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!tavilyKey || !openaiKey)
    return new Response(JSON.stringify({ error: "API keys missing. Add TAVILY_API_KEY and OPENAI_API_KEY in Vercel → Settings → Environment Variables." }), { status: 500 });

  const { query } = await req.json();
  if (!query?.trim()) return new Response(JSON.stringify({ error: "Query required" }), { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) =>
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
      try {
        send("status", { step: 1, message: "Searching web for public sources…" });
        const sources = await searchTavily(query.trim(), tavilyKey);
        if (!sources.length) { send("error", { message: "No sources found. Try a more specific feature name." }); ctrl.close(); return; }

        send("status", { step: 2, message: `Found ${sources.length} sources. Running GPT-4o extraction…` });
        const sourcesText = sources.map((s, i) => `[${i+1}] ${s.title}\nURL: ${s.url}\n${s.content}`).join("\n\n---\n\n");
        const userMsg = `Analyze the AI feature: "${query.trim()}"\n\nSources:\n---\n${sourcesText}\n---\nReturn only the JSON object.`;

        const llmRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: "gpt-4o", temperature: 0.1, max_tokens: 4000, stream: true, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userMsg }] }),
        });
        if (!llmRes.ok) { send("error", { message: `OpenAI error: ${(await llmRes.text()).slice(0,200)}` }); ctrl.close(); return; }

        send("status", { step: 3, message: "Extracting structured fields with confidence scoring…" });
        const reader = llmRes.body!.getReader();
        const dec = new TextDecoder();
        let raw = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of dec.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
            const chunk = line.slice(6);
            if (chunk === "[DONE]") continue;
            try { raw += JSON.parse(chunk).choices?.[0]?.delta?.content ?? ""; } catch { /* skip */ }
          }
        }

        send("status", { step: 4, message: "Applying confidence layer and PM insights…" });
        const cleaned = raw.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
        let result;
        try { result = JSON.parse(cleaned); }
        catch { send("error", { message: "Parse error. Try a different search term." }); ctrl.close(); return; }

        result.id = query.trim().toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g,"-");
        result.generatedAt = new Date().toISOString();
        const existingUrls = new Set((result.sources ?? []).map((s: { url: string }) => s.url));
        for (const s of sources)
          if (!existingUrls.has(s.url)) { result.sources = [...(result.sources ?? []), { title: s.title, url: s.url, type: "article" }]; existingUrls.add(s.url); }

        send("complete", result);
      } catch (e) {
        send("error", { message: e instanceof Error ? e.message : "Unknown error" });
      } finally { ctrl.close(); }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
