// Vercel Serverless Function — Jyoti Daily Remedy / Nakshatra / Soul Map
// Keeps API key secure server-side, never exposed to browser

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { chartSummary, lang, type, daysUntilMonthEnd } = req.body || {};

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
    : lang === 'es'
    ? 'Respond entirely in Spanish.'
    : 'Respond in English.';

  const isNakshatra = type === 'nakshatra';
  const isSoul      = type === 'soul';
  const isPlanet    = type === 'planets';
  const isPlanetA   = type === 'planets_a';
  const isPlanetB   = type === 'planets_b';
  const isPlanetC   = type === 'planets_c';
  const isPlanetD   = type === 'planets_d';
  const isDailyQuick = type === 'daily_quick';
  const isDailyDepth = type === 'daily_depth';

  // Prepend strong language enforcement for daily remedy (plain prompts — not planets which have explicit key rules)
  const isDailyRemedy = !isNakshatra && !isSoul && !isPlanet && !isPlanetA && !isPlanetB && !isPlanetC && !isPlanetD;

  // Detect month-end prep window (last 7 days of month)
  const _daysLeft = (() => {
    const d = parseInt(daysUntilMonthEnd);
    if (!isNaN(d) && d >= 0) return d;
    const m2 = (chartSummary || '').match(/Days until month end:\s*(\d+)/);
    return m2 ? parseInt(m2[1]) : 99;
  })();
  const isMonthEndPrep = isDailyRemedy && _daysLeft >= 0 && _daysLeft <= 7;

  const LANG_PREFIX = isDailyRemedy
    ? (lang === 'hi'
      ? 'LANGUAGE REQUIREMENT: Respond entirely in Hindi (Devanagari script). Every human-readable text value in the JSON must be in Hindi. JSON keys stay in English.\n\n'
      : lang === 'es'
      ? 'REQUISITO DE IDIOMA: Responde completamente en español. Todos los valores de texto legibles en el JSON deben estar en español. Las claves JSON permanecen en inglés.\n\n'
      : '')
    : '';

  const systemPrompt = isNakshatra
    ? `You are Jyoti, a compassionate Nadi astrology guide. Write one beautiful, specific paragraph (3-4 sentences) about this person's Moon nakshatra. Warm, poetic, deeply accurate to classical Vedic tradition. Never alarming. Always uplifting and truthful. Never use an em dash (—) or en dash (–); use a comma, period, semicolon, or colon instead. ${langInstruction} Return plain text only, no formatting, no preamble.`

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
PUNCTUATION: Never use an em dash (—) or en dash (–) anywhere in the text; use a comma, period, semicolon, colon, or parentheses instead.
${langInstruction}
Return plain text only, four paragraphs separated by blank lines. No headings, no bullets, no numbering.`

    : (isPlanet || isPlanetA || isPlanetB || isPlanetC || isPlanetD)
? `You are Jyoti, a Vedic astrology master drawing from Brihat Parashara Hora Shastra, Phaladeepika, Saravali, and the Nadi tradition.

Write a personalised lifetime reading for each of the planets listed below. Each reading must be EXACTLY 2 sentences, no more. Direct, personal, specific to their exact sign, house, and nakshatra. Never generic. Never use an em dash (—) or en dash (–); use a comma, period, semicolon, or colon instead.

${isPlanetA ? 'Write readings for: Sun, Moon, Mars.\n\nReturn valid JSON only — no markdown, no backticks:\n{"Sun":"...","Moon":"...","Mars":"..."}' : ''}${isPlanetB ? 'Write readings for: Mercury, Jupiter, Venus.\n\nReturn valid JSON only — no markdown, no backticks:\n{"Mercury":"...","Jupiter":"...","Venus":"..."}' : ''}${isPlanetC ? 'Write readings for: Saturn, Rahu.\n\nReturn valid JSON only — no markdown, no backticks:\n{"Saturn":"...","Rahu":"..."}' : ''}${isPlanetD ? 'Write the reading for Ketu only.\n\nReturn valid JSON only — no markdown, no backticks:\n{"Ketu":"..."}' : ''}${isPlanet ? 'Write readings for all nine planets.\n\nReturn valid JSON only — no markdown, no backticks:\n{"Sun":"...","Moon":"...","Mars":"...","Mercury":"...","Jupiter":"...","Venus":"...","Saturn":"...","Rahu":"...","Ketu":"..."}' : ''}
${lang === 'hi'
  ? 'IMPORTANT: Write the reading text in Hindi (Devanagari script). The JSON keys — "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu" — must remain in English exactly as shown. Only the reading values (the text after the colon) should be in Hindi.'
  : lang === 'es'
  ? 'IMPORTANT: Write the reading text in Spanish. The JSON keys must remain in English exactly as shown. Only the reading values should be in Spanish.'
  : 'Write the readings in English.'}`

    : isDailyQuick
    ? `${langInstruction} Every word must be in the requested language.

You are Jyoti, a Nadi Jyotish guide. Write a focused daily practice reading for this exact chart. Every sentence must name a specific planet, house, nakshatra, or dasha lord from this chart — nothing generic.

THREE-LAYER ANALYSIS before writing: (a) Vara lord — today's weekday ruler and its exact natal placement; (b) Pratyantara dasha lord — immediate karmic influence right now; (c) Any transit within 5° of a natal planet today.

RULES: Keep practices SHORT — 1-2 sentences each. Mantra must be a real Vedic mantra suited to the Pratyantara dasha lord. No em dashes. Return valid JSON only — no markdown, no backticks.

JSON:
{
  "cosmic_weather": "1-2 sentences: Vara lord in this chart + Pratyantara dasha energy + any tight transit. Specific to this chart only.",
  "has_remedy": true,
  "remedy": {
    "title": "Name of today's practice",
    "timing": "Best time with brief reason from this chart",
    "practices": [
      "1-2 sentences. Primary morning action naming the specific planet or house. Starts with a verb.",
      "1-2 sentences. A second practice type naming a dasha lord or planetary placement.",
      "1-2 sentences. A body or quality practice grounded in this chart's conditions today."
    ],
    "mantra": "Exact Sanskrit mantra or null",
    "mantra_phonetic": "Syllable guide or null",
    "mantra_count": 108,
    "mantra_meaning": "Brief translation",
    "mantra_why": "One sentence: why this mantra for this planet and placement today."
  },
  "no_remedy_message": null,
  "gemstone": null
}`

    : isDailyDepth
    ? `${langInstruction} Every single word must be in the requested language.

You are Jyoti, a master Nadi Jyotish guide providing the expanded daily practice guidance. The user has already seen the three action bullets and mantra for today. Now give them the deeper layer.

RULES: Warm, specific, grounded in this chart. No em dashes (—) or en dashes (–). No generic content. No medical/financial/legal advice. Valid JSON only.

JSON structure:
{
  "karma_thread": "1-2 sentences. What deeper pattern is this person working through in this dasha period? Connect today honestly and warmly to their larger karmic arc.",
  "morning_practice": "3-5 complete instructional sentences expanding on today's primary practice. Physical orientation (direction, posture, materials), repetitions or duration, quality of attention, what this awakens specifically in this chart. Write as a teacher.",
  "body_practice": "2-3 sentences. Name the practice (asana, pranayama, mudra). Precise instruction on position, breath, duration. What quality in this chart it directly addresses.",
  "evening_practice": "2-3 sentences. A specific practice for completion or integration, different in quality from morning. Timing and what to consciously release.",
  "contemplation": "One searching question for journaling or meditation — specific to the karmic pattern in their current Pratyantara dasha. Not generic. The real growing edge of their work right now."
}`

    : `${langInstruction} Every single word of your response must be in the requested language — do not switch to English at any point.

You are Jyoti, a master Nadi Jyotish guide. Your daily practice readings are the antithesis of generic horoscope content: each word is specific to this exact person's chart on this exact day. You write as a wise teacher speaking directly to a student — complete, instructional guidance that tells them what to do, how to do it precisely, and why it serves their specific planetary conditions today. No bullet fragments. No filler. No content that could apply to anyone of any sign.

CLASSICAL SOURCES: Brihat Parashara Hora Shastra (BPHS), Phaladeepika, Saravali, Brihat Jataka, and the South Indian Nadi oral tradition. Mantra sources: Rig Veda, Atharva Veda, and the Shaiva/Vaishnava Tantras. Every practice named must be traceable to one of these lineages.

CLASSICAL REMEDY REPERTOIRE — draw from these when appropriate, but always choose the mantra or practice that fits this specific chart, not just the day:
Sun: Gayatri Mantra, Aditya Hrudayam Stotram, Surya Arghya (water offering at sunrise)
Moon: Om Namah Shivaya, Chandra mantra, sitting by water at dusk, warm milk practice
Mars: Hanuman Chalisa, Skanda Shashti Kavacham, vigorous physical practice facing south
Mercury: Vishnu Sahasranamam, Nadi Shodhana pranayama, intentional writing and study
Jupiter: Guru Paduka Stotram, Guru Vandana, turmeric tilak, facing northeast, acts of true generosity
Venus: Maha Lakshmi Ashtakam, Lalita Sahasranamam, rose or jasmine offering, beauty as sadhana
Saturn: Sri Rudram, Hanuman Chalisa, sesame oil lamp facing west, service without recognition
Rahu: Durga Saptashati, Kali mantras, camphor flame at dusk, Trataka gazing
Ketu: Ganesha mantras, Skanda mantras, mauna (intentional silence), navel meditation

GEMSTONE GUIDANCE (Ratna Chikitsa):
Sun=Ruby, Moon=Pearl, Mars=Red Coral, Mercury=Emerald, Jupiter=Yellow Sapphire, Venus=Diamond, Saturn=Blue Sapphire, Rahu=Hessonite (Gomed), Ketu=Cat's Eye (Lehsunia).
CRITICAL: ONLY suggest a gemstone when the planet is strong and unafflicted in the natal chart. Gemstones amplify energy; suggesting one for an afflicted planet causes harm. Most days require no gemstone. Only include when genuinely indicated.

ABSOLUTE RULES:
1. TONE: Warm, loving, compassionate always. Challenges are growth opportunities. Malefics are teachers, never punishments.
2. THREE-LAYER ANALYSIS before writing: (a) Vara lord — today's weekday ruler and its exact natal placement quality; (b) Pratyantara dasha lord — immediate karmic activation; (c) Exact transits within 5 degrees of natal planets right now. Every practice emerges from these three layers.
3. WEEKDAY RULERS: Sunday=Sun, Monday=Moon, Tuesday=Mars+Ketu, Wednesday=Mercury, Thursday=Jupiter, Friday=Venus, Saturday=Saturn+Rahu.
4. NEVER give medical, psychiatric, financial, or legal advice. Never claim specific outcomes. Frame everything as spiritual practice.
5. NEVER use an em dash (—) or en dash (–) anywhere. Use commas, colons, semicolons, or periods instead.
6. FORMAT: Return valid JSON only. No markdown, no backticks, no preamble.
7. LANGUAGE: ${langInstruction}
${isMonthEndPrep ? `8. MONTH-END SUPPLY LIST: The subscriber has ${_daysLeft} day${_daysLeft===1?'':'s'} remaining in this month. Include a "month_end_prep" field with physical ritual items grounded in their active dasha lords for next month. 4-7 items with categories, quantities, and practical sourcing notes.\n` : ''}
JSON structure:
{
  "cosmic_weather": "1-2 sentences. Name today's Vara lord and its exact natal placement quality. Name the Pratyantara dasha lord and what karma it is ripening. Name any transit within 5 degrees of a natal planet right now. Nothing here could apply to a different chart.",
  "has_remedy": true or false,
  "remedy": {
    "title": "Name of today's practice, specific to these chart conditions",
    "timing": "Best time today with brief reasoning drawn from the chart",
    "practices": [
      "BULLET 1 — 1-2 sentences. The primary morning action naming the specific planet or house this serves. Starts with a verb. Immediately actionable.",
      "BULLET 2 — 1-2 sentences. A second distinct practice type. Must name a planetary placement or dasha influence.",
      "BULLET 3 — 1-2 sentences. A body practice or intentional quality to carry through the day. Grounded in this chart."
    ],
    "mantra": "Exact Sanskrit mantra, or null",
    "mantra_phonetic": "Syllable guide e.g. 'Om (ohm) · Hraam (hraam)'. Middle dot within words, space between. Always include when mantra given.",
    "mantra_count": 108 or 27 or 21 or 9 or null,
    "mantra_meaning": "Brief translation, or null",
    "mantra_why": "One sentence: why this mantra for this planet and placement today."
  },
  "no_remedy_message": "If has_remedy is false, a warm message about why today calls for rest. Null if remedy exists.",
  "gemstone": { "stone": "name", "planet": "planet it serves", "wear": "how, when, which finger", "why": "why this stone for this person now, naming the placement" } or null${isMonthEndPrep ? `,
  "month_end_prep": {
    "title": "e.g. 'July Practice Supplies'",
    "intro": "1-2 sentences on how these items serve this person's specific dasha energy for next month",
    "items_needed": [
      "Category: Item name, quantity, practical sourcing note",
      "...4-7 items total..."
    ],
    "timing_note": "One practical sentence on when and where to source these before the month begins"
  }` : ''}
}`;

  const userMessage = isNakshatra
    ? chartSummary
    : isSoul
    ? `Here is the birth chart:\n${chartSummary}\n\nWrite the Soul Map & Karmic Blueprint.`
    : (isPlanet || isPlanetA || isPlanetB || isPlanetC || isPlanetD)
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
          model: (isPlanetA || isPlanetB || isPlanetC || isPlanetD) ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6',
          max_tokens: (()=>{
            // Hindi/Spanish need more tokens — Devanagari ~40% more, Spanish ~20% more
            const hi = lang === 'hi', es = lang === 'es';
            if (isSoul)                        return hi ? 2600 : es ? 2400 : 2000;
            if (isPlanet)                      return hi ? 2400 : es ? 2200 : 1800;
            if (isPlanetD)                     return hi ?  350 : es ?  280 :  220;
            if (isPlanetC)                     return hi ?  600 : es ?  480 :  380;
            if (isPlanetA || isPlanetB)        return hi ?  900 : es ?  700 :  560;
            if (isDailyDepth)  return hi ? 1200 : es ? 1050 :  900;
            if (isDailyQuick)  return hi ?  950 : es ?  850 :  750;
            return                                    hi ? 3800 : es ? 3200 : 2800; // daily legacy
          })(),
          system: LANG_PREFIX + systemPrompt,
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
    // Attempt 2b: collapse all whitespace chars
    if (!parsed) {
      try { parsed = JSON.parse(clean.replace(/[\r\n\t]+/g, ' ')); } catch(_) {}
    }
    // Attempt 4: key-by-key extraction — works even when JSON is truncated with no closing }
    if (!parsed) {
      const pairs = {};
      const re = /"(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu|greeting|cosmic_weather|has_remedy|remedy|no_remedy_message|tomorrow_preview)"\s*:\s*("(?:[^"\\]|\\.)*"|true|false|\{[\s\S]*?\}|\[[\s\S]*?\])/g;
      let hit;
      while ((hit = re.exec(text)) !== null) {
        try { pairs[hit[1]] = JSON.parse(hit[2]); } catch(_) {
          try { pairs[hit[1]] = JSON.parse(hit[2].replace(/[\r\n\t]+/g, ' ')); } catch(_2) {}
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
