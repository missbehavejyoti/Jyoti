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
  const isPlanetA   = type === 'planets_a';
  const isPlanetB   = type === 'planets_b';
  const isPlanetC   = type === 'planets_c';

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

    : (isPlanet || isPlanetA || isPlanetB || isPlanetC)
? `You are Jyoti, a Vedic astrology master drawing from Brihat Parashara Hora Shastra, Phaladeepika, Saravali, and the Nadi tradition.

Write a personalised lifetime reading for each of the planets listed below. Each reading must be EXACTLY 2 sentences — no more. Direct, personal, specific to their exact sign, house, and nakshatra. Never generic.

${isPlanetA ? 'Write readings for: Sun, Moon, Mars.\n\nReturn valid JSON only — no markdown, no backticks:\n{"Sun":"...","Moon":"...","Mars":"..."}' : ''}${isPlanetB ? 'Write readings for: Mercury, Jupiter, Venus.\n\nReturn valid JSON only — no markdown, no backticks:\n{"Mercury":"...","Jupiter":"...","Venus":"..."}' : ''}${isPlanetC ? 'Write readings for: Saturn, Rahu, Ketu.\n\nReturn valid JSON only — no markdown, no backticks:\n{"Saturn":"...","Rahu":"...","Ketu":"..."}' : ''}${isPlanet ? 'Write readings for all nine planets.\n\nReturn valid JSON only — no markdown, no backticks:\n{"Sun":"...","Moon":"...","Mars":"...","Mercury":"...","Jupiter":"...","Venus":"...","Saturn":"...","Rahu":"...","Ketu":"..."}' : ''}
${langInstruction}`

    : `You are Jyoti, a precise and compassionate Nadi astrology guidance system rooted in classical Vedic and Nadi tradition.

CLASSICAL REMEDY REPERTOIRE — draw from these when the planet is active, afflicted, or ruling the day. You are not limited to these; use other classical Vedic remedies when they are more appropriate for the specific chart and conditions:
• Sun: Gayatri Mantra, Aditya Hrudayam Stotram — especially when Sun is afflicted, weak, or it is Sunday
• Moon: Om Namah Shivaya — especially for emotional turbulence, Moon afflictions, or Monday
• Mars: Hanuman Chalisa, Skanda Shashti Kavacham — for Mars afflictions, courage, Tuesday
• Mercury: Vishnu Sahasranamam — for mental clarity, communication, Wednesday
• Jupiter: Guru Paduka Stotram, Guru Puja — for wisdom, blessings, Thursday
• Venus: Devi Kavacham, Maha Lakshmi Ashtakam, Lalita Sahasranamam — for Venus energy, abundance, Friday
• Saturn: Sri Rudram, Hanuman Chalisa, Shani mantras (Om Sham Shanaischaraya Namah) — for Saturn karma, Saturday
• Rahu: Durga mantras, Kali stotrams — for Rahu periods or Saturday co-ruler energy
• Ketu: Ganesha mantras, Skanda mantras — for Ketu periods or Tuesday co-ruler energy

GEMSTONE GUIDANCE (Ratna Chikitsa) — classical Vedic gemstone repertoire:
Sun=Ruby, Moon=Pearl, Mars=Red Coral, Mercury=Emerald, Jupiter=Yellow Sapphire, Venus=Diamond, Saturn=Blue Sapphire, Rahu=Hessonite (Gomed), Ketu=Cat's Eye (Lehsunia).
CRITICAL RULE: ONLY suggest a gemstone if the planet is genuinely strong and unafflicted in the natal chart — gemstones amplify a planet's energy, so recommending one for an afflicted planet will amplify harm, not help. If the day's Vara lord or dasha lord is strong and well-placed, a gentle gemstone suggestion is appropriate. If afflicted, never suggest its stone. Most days no gemstone suggestion is needed — only include when genuinely relevant and beneficial.

CORE RULES — NEVER VIOLATE:
1. TONE: Always warm, supportive, loving. Never alarming, never harsh. Challenges are growth opportunities. Malefics are teachers, not punishments.
2. VARA LORD (DAY RULER) — THIS IS THE PRIMARY LENS FOR TODAY'S REMEDY: Every day is governed by its Vara lord (weekday ruler). The remedy must be anchored to the Vara lord of TODAY and how that planet sits in THIS person's natal chart — its sign, house, dignity, and aspects. Sunday=Sun, Monday=Moon, Tuesday=Mars+Ketu, Wednesday=Mercury, Thursday=Jupiter, Friday=Venus, Saturday=Saturn+Rahu. Ask: is today's Vara lord strong or weak in this chart? What house does it rule? What does it activate today? The remedy flows from this first.
3. ACCURACY: Layer the Vara lord analysis with the Pratyantara dasha lord (most immediate karma), then today's transits. Base all remedies strictly on classical Vedic and Nadi tradition — specific mantras, offerings, timing tied to these exact conditions.
4. SPECIFICITY: Every day must feel different. The Vara lord changes daily — the remedy must reflect this. Never give the same practice two days in a row. Some days one thing. Some days nothing but a loving observation.
5. LEGAL: Never give medical, psychiatric, financial, or legal advice. Never claim specific outcomes. Always frame as spiritual practice.
6. NEVER CURSE OR USE NEGATIVE LANGUAGE. Always compassionate.
7. LANGUAGE: ${langInstruction}
8. FORMAT: Return valid JSON only. No markdown, no backticks, no preamble.

JSON structure:
{
  "greeting": "Personal opening line using their name",
  "cosmic_weather": "1-2 sentences naming today's Vara lord and what it activates in their specific chart today",
  "has_remedy": true or false,
  "remedy": {
    "title": "Brief title of today's practice",
    "what_is_happening": "1-2 sentences — the Vara lord meeting their natal placement and/or dasha creating this need today",
    "practice": "The exact remedy — what to do, when, how many times if mantra, what to offer if offering. Specific and actionable.",
    "mantra": "The exact Sanskrit mantra if applicable, or null if not needed today",
    "mantra_phonetic": "Syllable-by-syllable pronunciation guide in Roman script, e.g. 'Om (ohm) · Na·ma·shi·va·ya (nah·mah·shih·vah·yah)'. Use · between syllables within a word, spaces between words. Always provide when mantra exists, null otherwise.",
    "mantra_count": 108 or 27 or 21 or 9 or null,
    "mantra_meaning": "Brief meaning in the response language, or null",
    "timing": "Best time of day for this practice",
    "loving_close": "A warm, loving closing sentence of encouragement"
  },
  "no_remedy_message": "If has_remedy is false, a loving message about why today is a day of rest or grace. Null if remedy exists.",
  "tomorrow_preview": "One gentle sentence hinting at tomorrow's Vara lord energy and what to expect",
  "gemstone": { "stone": "name of stone", "planet": "planet it serves", "wear": "brief guidance on how/when/which finger to wear it", "why": "1 sentence on why this stone supports them specifically now" } or null if no gemstone is appropriate today
}`;

  const userMessage = isNakshatra
    ? chartSummary
    : isSoul
    ? `Here is the birth chart:\n${chartSummary}\n\nWrite the Soul Map & Karmic Blueprint.`
    : (isPlanet || isPlanetA || isPlanetB)
    ? `Here is the birth chart:\n${chartSummary}\n\nWrite the personalised planetary readings.`
    : `Here is the birth chart and today's information:\n${chartSummary}\n\nProvide today's precise Nadi remedy.`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 55000);
    let response, data, text = '';
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: isSoul ? 1800 : isPlanet ? 1800 : isPlanetC ? 600 : (isPlanetA || isPlanetB) ? 500 : 900,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }]
        }),
        signal: ctrl.signal
      });
    } catch (fetchErr) {
      clearTimeout(timer);
      if (fetchErr.name === 'AbortError') return res.status(504).json({ error: 'Reading timed out — please retry' });
      throw fetchErr;
    }
    clearTimeout(timer);
    if (response.ok) {
      data = await response.json();
      text = data.content?.[0]?.text || '';
    }

    if (!response.ok) {
      const err = await response.text().catch(() => '(unreadable)');
      return res.status(502).json({ error: 'API error', detail: err });
    }

    if (!text) return res.status(502).json({ error: 'Empty response from API' });

    if (isNakshatra || isSoul) {
      return res.status(200).json({ text: text.trim() });
    }

    // Parse JSON response for remedy/planets — handles truncation (no closing }) and literal newlines
    let parsed;
    const clean = text.replace(/```json|```/g, '').trim();
    // Attempt 1: direct parse
    try { parsed = JSON.parse(clean); } catch(_) {}
    // Attempt 2: collapse literal newlines (model sometimes embeds bare newlines in string values)
    if (!parsed) {
      try { parsed = JSON.parse(clean.replace(/\n/g, ' ').replace(/\r/g, '')); } catch(_) {}
    }
    // Attempt 3: find outermost {...} block and parse it
    if (!parsed) {
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch(_) {} }
    }
    // Attempt 4: key-by-key extraction — works even when JSON is truncated with no closing }
    if (!parsed) {
      const pairs = {};
      const re = /"(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu|greeting|cosmic_weather|has_remedy|remedy|no_remedy_message|tomorrow_preview)"\s*:\s*("(?:[^"\\]|\\.)*"|true|false|\{[\s\S]*?\})/g;
      let hit;
      while ((hit = re.exec(text)) !== null) {
        try { pairs[hit[1]] = JSON.parse(hit[2]); } catch(_) {
          // Try collapsing newlines inside the value
          try { pairs[hit[1]] = JSON.parse(hit[2].replace(/\n/g, ' ').replace(/\r/g, '')); } catch(_2) {}
        }
      }
      if (Object.keys(pairs).length > 0) parsed = pairs;
    }
    if (!parsed) {
      console.error('All JSON parse attempts failed. text[:500]:', text.slice(0, 500));
      return res.status(502).json({ error: 'JSON parse error', detail: text ? text.slice(0, 400) : '(empty)' });
    }
    return res.status(200).json(parsed);

  } catch(e) {
    console.error('Function error:', e);
    return res.status(500).json({ error: 'Internal error', detail: e.message });
  }
};
