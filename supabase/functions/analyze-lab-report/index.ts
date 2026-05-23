import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, fileName } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image data provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert medical lab report and ECG analyst. Analyze the uploaded medical document image thoroughly.

Your response MUST follow this exact markdown structure:

## 📋 Report Summary
A 2-3 sentence overview of the report type and overall assessment.

## 🔬 Key Findings

For each parameter found, use this format:
- **Parameter Name**: Value — Status (Normal ✅ / Borderline ⚠️ / Abnormal 🔴)
  - *Reference Range*: X - Y units
  - *Clinical Significance*: Brief explanation of what this means

## ⚠️ Abnormal Values (if any)
List only the values that are outside normal range with:
- What the abnormality indicates
- Possible medical conditions associated
- Recommended follow-up tests

## 💡 Medical Keywords
List relevant medical terminology found or implied in the report as bullet points with brief definitions.

## 📝 Plain Language Summary
Explain the entire report in simple, easy-to-understand language as if explaining to a patient with no medical background. Highlight:
- What's good
- What needs attention
- What lifestyle changes might help

## ⚕️ Recommended Actions
- Actionable next steps based on findings
- Whether urgent medical consultation is needed

IMPORTANT: Always recommend consulting a healthcare professional. Be thorough but clear. If the image is unclear or not a medical document, state that clearly.`;

    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              {
                type: "text",
                text: `Please analyze this medical document (${fileName || "lab report"}). Extract all data, identify abnormalities, and provide a comprehensive but readable summary.`,
              },
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI service is busy. Please wait a few seconds and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("Gemini gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI analysis failed. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const analysisContent = data.choices?.[0]?.message?.content || "Unable to analyze the report.";

    return new Response(JSON.stringify({ analysis: analysisContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-lab-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
