// Vercel Serverless Function — Jyoti Daily Remedy
// Keeps API key secure server-side, never exposed to browser

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { chartSummary, lang, type } = req.body || {};

  if (!chartSummary) return res.status(400).json({ error: 'Missing chart data' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API not configured' });

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
2. ACCURACY: Base all remedies strictly on classical Vedic and Nadi tradition, tied to the exact planetary conditions of today meeting this birth chart.
3. REMEDY TYPES — choose ONE or at most TWO that genuinely fit today: mantra (with exact Sanskrit and count), offering to a deity or nature (what, to whom, where), gemstone to wear or hold, color to wear that day, food to eat or consciously avoid, activity such as feeding crows or birds (Saturn/Ketu), feeding ants (Rahu), lighting a ghee lamp or incense, simple charity or donation. NEVER prescribe many types at once — one remedy done with love is more powerful than a list. Keep it accessible and peaceful, not overwhelming.
4. SPECIFICITY: Only prescribe what is genuinely needed TODAY. Some days one simple thing. Some days nothing but a loving observation. Never generic.
5. LEGAL: Never give medical, psychiatric, financial, or legal advice. Never claim specific outcomes. Always frame as spiritual practice.
6. NEVER CURSE OR USE NEGATIVE LANGUAGE. Always compassionate.
7. LANGUAGE: ${langInstruction}
8. FORMAT: Return valid JSON only. No markdown, no backticks, no preamble.

JSON structure:
{
  "greeting": "Personal opening line using their name",
  "cosmic_weather": "1-2 sentences on what is happening cosmically today and how it meets their chart specifically",
  "has_remedy": true or false,
  "remedy": {
    "title": "Brief title of today's practice",
    "what_is_happening": "1-2 sentences — the specific planetary meeting creating this need today",
    "practice": "The exact remedy — specific and actionable. If mantra: exact Sanskrit and count. If gemstone: which stone, how to wear or hold. If color: what to wear. If food: what to eat or avoid and why. If feeding crows/birds/ants: exactly how. If offering: to whom, what, where. Choose ONE remedy type that truly fits today.",
    "mantra": "The exact Sanskrit mantra if applicable, or null",
    "mantra_count": 108 or 27 or 21 or 9 or null,
    "mantra_meaning": "Brief meaning in the response language, or null",
    "timing": "Best time of day for this practice",
    "loving_close": "A warm, loving closing sentence of encouragement"
  },
  "no_remedy_message": "If has_remedy is false, a loving message about why today is a day of rest or grace. Null if remedy exists.",
  "tomorrow_preview": "One gentle sentence hinting at tomorrow's energy",
  "month_end_prep": null
}

If "Days until month end" in the chart data is 4 or fewer, set month_end_prep to an object (not null):
{
  "title": "Preparing for [next month name]",
  "intro": "One warm sentence about gathering for the month ahead",
  "items_needed": ["4-6 specific items to gather, each with a brief note on why/how — e.g., 'Yellow cloth or scarf — for Jupiter remedy days', 'Sesame seeds — for Saturn offerings on Saturdays'"],
  "timing_note": "Gentle note on when to gather these"
}
Base the items on this person's specific chart needs (dominant planets, malefics, dasha lord). Keep the list feel gentle and manageable, not like homework.`;

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
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'API error', detail: err });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    if (isNakshatra) {
      return res.status(200).json({ text: text.trim() });
    }

    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (e) {
    console.error('Function error:', e);
    return res.status(500).json({ error: 'Internal error', detail: e.message });
  }
};
