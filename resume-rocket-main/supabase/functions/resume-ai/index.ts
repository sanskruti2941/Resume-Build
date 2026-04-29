import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ResumeAiRequest = {
  mode: "improveBullet" | "improveResume" | "keywords" | "feedback";
  content?: string;
  resume?: unknown;
  role?: string;
  harsh?: boolean;
};

const systemPrompt = `You are an expert resume strategist and ATS optimization coach. Return only valid JSON. Keep suggestions specific, concise, measurable, and professional. Never invent employers, schools, dates, certifications, or metrics; if a metric is missing, rewrite with a placeholder style such as "improved X by Y%" only when clearly labeled as a suggestion.`;

const buildPrompt = ({ mode, content, resume, role, harsh }: ResumeAiRequest) => {
  if (mode === "improveBullet") {
    return `Rewrite this resume bullet professionally with impact, action verbs, and ATS-friendly language. Return JSON: {"text":"..."}. Bullet: ${content ?? ""}`;
  }

  if (mode === "keywords") {
    return `For the job role "${role ?? "general"}", suggest 12 ATS keywords and 5 concise resume focus tips. Return JSON: {"keywords":["..."],"tips":["..."]}.`;
  }

  if (mode === "feedback") {
    return `Review this resume data. Tone: ${harsh ? "brutally honest HR reviewer, but useful" : "professional coach"}. Return JSON: {"feedback":["..."],"warnings":["..."],"scoreAdjustment":0}. Resume: ${JSON.stringify(resume).slice(0, 16000)}`;
  }

  return `Improve the entire resume data while preserving the same JSON structure and not inventing facts. Strengthen summaries, experience bullets, project bullets, and skill wording. Return JSON: {"resume": <improved resume object>, "notes":["..."]}. Resume: ${JSON.stringify(resume).slice(0, 18000)}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured yet." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = (await req.json()) as ResumeAiRequest;
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildPrompt(payload) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "AI rate limit reached. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits are exhausted. Please add credits in Workspace usage settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI gateway error", response.status, await response.text());
      return new Response(JSON.stringify({ error: "AI request failed." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    return new Response(content, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("resume-ai error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
