// Vercel Serverless Function — Jyoti Daily Remedy / Nakshatra / Soul Map
// Keeps API key secure server-side, never exposed to browser

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { chartSummary, lang, type } = req.body || {};

  if (!chartSummary) {
    return res.status(400).json({ error: 'Missing chart data' });
  }

  // API key from Vercel environment variable (never in code)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API not configured' });
  }

  const langInstruction = lang === 'hi'
    ? 'Respond entirely in Hindi (Devanagari script).'
    : lang === 'ta'
    ? 'Respond entirely in Tamil script.'
    : 'Respond in English.';

  const isNakshatra = type === 'nakshatra';
  const isSoul      = type === 'soul';
  const isPlanet    = type === 'planets';

  const systemPrompt = isNakshatra
    ? `You are Jyoti, a compassionate Nadi astrology guide. Write one beautiful, specific paragraph (3-4 sentences) about this person's Moon nakshatra. Warm, poetic, deeply accurate to classical Vedic tradition. Never alarming. Always uplifting and truthful. ${langInstruction} Return plain text only, no formatting, no preamble.`

    : isSoul
    ? `You are Jyoti, a master of Vedic Jyotish drawing from the great classical texts: Brihat Parashara Hora Shastra (BPHS), Phaladeepika, Saravali, Brihat Jataka, Jataka Parijata, and the Nadi tradition.

Write a "Soul Map & Karmic Blueprint" — four paragraphs of genuine depth and classical precision. Every sentence must be specific to THIS chart. No generic statements. No repetition between paragraphs.

PARAGRAPH 1 — SOUL MISSION (Lagna & Lagna lord placement):
The Ascendant and its ruling planet's sign and house placement describe the fundamental quality of consciousness this soul incarnated to develop. What is the specific dharmic mission encoded in this Lagna? What capacity must this person embody and offer to the world? Draw from BPHS chapters on Lagna lords and their house placements.

PARAGRAPH 2 — EMOTIONAL KARMA (Moon: sign, nakshatra, house):
The Moon carries the jīva — the soul-essence and its entire emotional inheritance across lifetimes. The nakshatra is the soul's most primal instinctive fingerprint. What karmic emotional pattern has this soul carried forward? How does it transform through this lifetime? Reference the classical nakshatra significations with precision.

PARAGRAPH 3 — DHARMIC GIFTS & KARMIC KNOTS:
Name the 2-3 most significant planetary placements for this soul's evolution. For each: what specific dharmic gift or yogic strength does it bestow, and what karmic knot — through debilitation, difficult house, or planetary war — does it invite the soul to untangle? Draw from classical yoga descriptions.

PARAGRAPH 4 — SOUL DIRECTION: THE RAHU-KETU AXIS:
Rahu marks the direction of soul growth — the unfamiliar territory the soul must bravely claim. Ketu marks the mastery carried from past lives — the gifts and compulsions it must honour and release. Be precise about the signs and houses of this specific axis.

Tone: spiritually precise, compassionate, deeply informed by classical tradition. Soul-affirming. Poetic where the tradition is poetic. Never alarming. Never generic.
${langInstruction}
Return plain text only — four paragraphs separated by blank lines. No headings, no bullets, no numbering.`

    : isPlanet
? `You are Jyoti, a Vedic astrology master drawing from Brihat Parashara Hora Shastra, Phaladeepika, Saravali, and the Nadi tradition.

Write a personalised lifetime reading for each planet in this person's birth chart. Each reading must be a full paragraph of 3-4 sentences — direct, personal, and alive — like a master astrologer speaking intimately to this specific person about their entire life's journey with this placement. Be deeply specific to their exact sign, house position, and nakshatra. Address: what this placement means in their lived experience across a lifetime, the dharmic gift or strength it bestows, and the karmic challenge or growth pattern it carries. Never be generic. Every sentence must be specific to THIS chart.

${langInstruction}
Return valid JSON only — no markdown, no backticks:
{"Sun":"...","Moon":"...","Mars":"...","Mercury":"...","Jupiter":"...","Venus":"...","Saturn":"...","Rahu":"...","Ketu":"..."}`

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
    "mantra_phonetic": "Syllable-by-syllable pronunciation guide in Roman script, e.g. 'Om (ohm) · Na·ma·shi·va·ya (nah·mah·shih·vah·yah)'. Use · between syllables within a word, spaces between words. Always provide when mantra exists, null otherwise.",
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
    : isSoul
    ? `Here is the birth chart:\n${chartSummary}\n\nWrite the Soul Map & Karmic Blueprint.`
    : isPlanet
    ? `Here is the birth chart:\n${chartSummary}\n\nWrite the personalised planetary readings.`
    : `Here is the birth chart and today's information:\n${chartSummary}\n\nProvide today's precise Nadi remedy.`;

  try {
    // Retry up to 3 times on transient overload (529) or server errors (503/502)
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: isSoul ? 1200 : isPlanet ? 1800 : 1000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }]
        })
      });
      if (response.ok) break;
      if (![429, 502, 503, 529].includes(response.status)) break;
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'API error', detail: err });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    if (isNakshatra || isSoul) {
      return res.status(200).json({ text: text.trim() });
    }

    // Parse JSON response for remedy/planets — robust extraction handles preamble/truncation
    let parsed;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch(_) {
      // Try to find a complete {...} block first
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); }
        catch(_2) {
          // Truncated JSON — extract completed "Key":"Value" pairs individually
          const pairs = {};
          const re = /"(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu|greeting|cosmic_weather|has_remedy|remedy|no_remedy_message|tomorrow_preview)"\s*:\s*("(?:[^"\\]|\\.)*"|true|false|\{[\s\S]*?\})/g;
          let hit;
          while ((hit = re.exec(text)) !== null) { try { pairs[hit[1]] = JSON.parse(hit[2]); } catch(_3) {} }
          if (Object.keys(pairs).length > 0) { parsed = pairs; }
          else {
            console.error('JSON parse failed, no pairs found:', text.slice(0, 300));
            return res.status(502).json({ error: 'JSON parse error' });
          }
        }
      } else {
        console.error('No JSON object in response:', text.slice(0, 300));
        return res.status(502).json({ error: 'No JSON in response' });
      }
    }
    return res.status(200).json(parsed);

  } catch(e) {
    console.error('Function error:', e);
    return res.status(500).json({ error: 'Internal error', detail: e.message });
  }
};
