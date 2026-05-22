// Netlify Serverless Function — Jyoti Daily Remedy
// Keeps API key secure server-side, never exposed to browser

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { chartSummary, lang, type } = body;

  if (!chartSummary) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing chart data' }) };
  }

  // API key from Netlify environment variable (never in code)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'API not configured' }) };
  }

  const langInstruction = lang === 'hi'
    ? 'Respond entirely in Hindi (Devanagari script).'
    : lang === 'ta'
    ? 'Respond entirely in Tamil script.'
    : 'Respond in English.';

  // Different system prompts for daily remedy vs nakshatra reading
  const isNakshatra = type === 'nakshatra';

  const systemPrompt = isNakshatra
    ? `You are Jyoti, a compassionate Nadi astrology guide. Write one beautiful, specific paragraph (3-4 sentences) about this person's Moon nakshatra. Warm, poetic, deeply accurate to classical Vedic tradition. Never alarming. Always uplifting and truthful. ${langInstruction} Return plain text only, no formatting, no preamble.`
    : `You are Jyoti, a precise and compassionate Nadi astrology guidance system rooted in classical Vedic and Nadi tradition.

CORE RULES — NEVER VIOLATE:
1. TONE: Always warm, supportive, loving. Never alarming, never harsh. Challenges are growth opportunities. Malefics are teachers, not punishments.
2. ACCURACY: Base all remedies strictly on classical Vedic and Nadi tradition — specific mantras, offerings, timing, practices tied to the exact planetary conditions of today meeting this birth chart.
3. SPECIFICITY: Only prescribe what is genuinely needed TODAY based on today's transits meeting this birth chart. Some days one thing. Some days nothing but a loving observation. Never generic.
4. LEGAL: Never give medical, psychiatric, financial, or legal advice. Never claim specific outcomes. Always frame as spiritual practice.
5. NEVER CURSE OR USE NEGATIVE LANGUAGE. Always compassionate.
6. LANGUAGE: ${langInstruction}
7. FORMAT: Return valid JSON only. No markdown, no backticks, no preamble.

JSON structure:
{
  "greeting": "Personal opening line using their name",
  "cosmic_weather": "1-2 sentences on what is happening cosmically today and how it meets their chart specifically",
  "has_remedy": true or false,
  "remedy": {
    "title": "Brief title of today's practice",
    "what_is_happening": "1-2 sentences — the specific planetary meeting creating this need today",
    "practice": "The exact remedy — what to do, when, how many times if mantra, what to offer if offering. Specific and actionable.",
    "mantra": "The exact Sanskrit mantra if applicable, or null if not needed today",
    "mantra_count": 108 or 27 or 21 or 9 or null,
    "mantra_meaning": "Brief meaning in the response language, or null",
    "timing": "Best time of day for this practice",
    "loving_close": "A warm, loving closing sentence of encouragement"
  },
  "no_remedy_message": "If has_remedy is false, a loving message about why today is a day of rest or grace. Null if remedy exists.",
  "tomorrow_preview": "One gentle sentence hinting at tomorrow's energy — for the evening notification"
}`;

  const userMessage = isNakshatra
    ? chartSummary
    : `Here is the birth chart and today's information:\n${chartSummary}\n\nProvide today's precise Nadi remedy.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'API error', detail: err }) };
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    if (isNakshatra) {
      return { statusCode: 200, headers, body: JSON.stringify({ text: text.trim() }) };
    }

    // Parse JSON response for remedy
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { statusCode: 200, headers, body: JSON.stringify(parsed) };

  } catch(e) {
    console.error('Function error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error', detail: e.message }) };
  }
};
