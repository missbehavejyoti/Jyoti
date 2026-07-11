// Vercel Serverless Function — Jyoti Career Reading (Nadi Jyotish Vocational Dharma)
const { rateLimit, dailyLimit } = require('./_rateLimit');
const { sanitizeDeep } = require('./_sanitize');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!await rateLimit(req, res, { max: 20, windowSecs: 3600, prefix: 'career' })) return;
  if (!await dailyLimit(req, res, { max: 50, prefix: 'career-day' })) return;

  const { chartSummary, lang, type, context } = req.body || {};

  const VALID_LANGS = ['en', 'hi', 'es'];
  const VALID_TYPES = ['career_layer1', 'career_layer2'];

  if (!chartSummary || typeof chartSummary !== 'string' || chartSummary.length > 10000) {
    return res.status(400).json({ error: 'Invalid chart data' });
  }
  if (!chartSummary.includes('°') || chartSummary.length < 200) {
    return res.status(400).json({ error: 'Chart data incomplete' });
  }
  if (!VALID_LANGS.includes(lang)) return res.status(400).json({ error: 'Invalid language' });
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid type' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API not configured' });

  const LANG_PREFIX = lang === 'hi'
    ? 'LANGUAGE REQUIREMENT: Respond entirely in Hindi (Devanagari script). Every human-readable text value in the JSON must be in Hindi. JSON keys stay in English. CRITICAL EXCEPTION: The "mantra" field must always contain the actual Sanskrit mantra text in Devanagari script — sacred sounds must never be translated or replaced with Hindi descriptions. The "mantra_translit" field is always plain Roman-letter transliteration, never Hindi. Only "mantra_meaning" and all other text fields go in Hindi.\n\n'
    : lang === 'es'
    ? 'REQUISITO DE IDIOMA: Responde completamente en español. Todos los valores de texto legibles en el JSON deben estar en español. Las claves JSON permanecen en inglés. EXCEPCIÓN CRÍTICA: El campo "mantra" debe contener siempre el texto del mantra en sánscrito (Devanagari) — nunca traducirlo. El campo "mantra_translit" es siempre transliteración romana simple. Solo "mantra_meaning" y los demás campos de texto van en español.\n\n'
    : '';

  const isLayer2 = type === 'career_layer2';

  const CAREER_SIGNATURES = `
CAREER TYPE SIGNATURES (Nadi Jyotish house combinations — match activated houses against these):
Lawyers / Legal: 6+11 or 1+7
Accountants / Finance professionals: 2+11, 3+11 (2nd house = finance, wealth, accumulation)
Creative arts / Film / Music / Writing: 5+8, 5+12, 3+5+11 (Rahu strengthens creative/foreign work; 10+11 supports public recognition)
Software / Technology / IT: 10+11, 6+10+11, 6+11, 6+5+9 (Rahu essential for technology careers — foreign influence, innovation)
Management / Leadership: 10+11 with Venus prominent (Financial management specifically: 2+10+11)
Human Resources / People management: 3+5+9+11, 3+4+5+9+11, 3+5+9+11
Politicians / Public figures: 1+6+8+10+11+12
Property / Real Estate: 4+11, 4+10+11, 4+11+12 (Saturn favoured; 12th house = money invested in property)
  Property dealer / broker: 4+11+3+5+10 (3 = giving away, facilitating)
Sports / Athletics: 5+10+11, 5+9+11, 5+11
Sales / Commerce: 3+10+11 (3rd house = communication + travel, essential for sales)
Research / Investigation: 8+11, 8+10+11
Doctors / Western medicine: 6+8+12 + 4+9+11 or 4+10+11 (famous doctors have 10+11 too)
Ayurvedic / Alternative healing / Naturopathy: 6+8+12 specifically
Astrology / Healing arts / Spiritual counselling: 6+8+12 (when 5+9 also present, the challenges are neutralised)
Consulting: 10+11
Business (own venture, self-employed): 7+11, 7+10+11 (7th house = business; 11th essential to profit)
Vehicles / Transport / Automotive industry: 4+11, 4+11+12 with Venus prominent
Pilot / Aviation: 9+11, 5+9+11, 3+9+11, 3+9+10+11
Spiritual teacher / Guide / Guru: 5+11, 5+9+11 with Jupiter prominent
Defense / Military / Armed forces: 7+8 or 7+12 + 10+11 with Mars strong
Teachers / Professors / Educators: 4+5+9+11; adding 10+11 = more renowned, academic
Insurance sector: 8+10+11
Work from home / Remote work: 4th house particularly prominent
Stocks / Shares / Trading / Investment: 5+11, 5+10+11
Communication / Online / Digital / Media: 3+11
Engineers: 4+5+8+9+11
Senior government / IAS / Bureaucrats: Sun and Moon both prominent + 10+11 (strong admin energy)
Revenue / Tax / Government finance: 2+11, 3+11
Police / Law enforcement: 7+8 or 7+12 with Mars strong
Unearned income / Passive income / Investments: 8+11 (excessive 8+11 without career houses = financial instability)`;

  const CAREER_RULES = `
NADI JYOTISH CAREER ANALYSIS RULES:

POSITIVE CAREER HOUSES: 2 (accumulated wealth, livelihood), 6 (employment, service, daily work), 7 (business, partnership), 10 (profession, public status, dharma), 11 (gains, income from career)

CHALLENGE COMBINATIONS:
  5th house active = change in job or field
  8th house active = obstacles, hidden challenges in career
  12th house active = loss in job, expenditure, foreign or isolated work
  5+8+12 together = lay-off, redundancy
  1+6+8+12 together = person resigns voluntarily
  9th house = change in status, position, or field of work
  5+9 together = change in work conditions and nature of role
  6+8+12 = strongest negative combination BUT: if 5+9 are also present, the negativity is neutralised
  5+9+6+8+12 all together = neutralised (dharma houses 5 and 9 protect against the damage)
  5+6+8+12 without the 9th = remains negative
  CRITICAL TIMING RULE: Career house combinations must be present in the ANTAR and/or PRATYANTARA Dasha to be actively manifesting NOW. The Maha Dasha alone sets the background era but does NOT trigger career events on its own. Events crystallise when Antar + Pratyantara carry the house combination. Any house appearing at ALL THREE DBA levels (Maha + Antar + Pratyantara) = extremely strong, near-certain current event

  6+8 without 12 = helping others, service-oriented work (social work, healing)
  6+8+12 = medical, healing, astrology, alternative therapies (but with inherent obstacles)
  8+12 = foreign work, isolated or behind-the-scenes roles, loss or transformation themes

INCOME READING:
  Primary income indicator: 11th house — assess its strength and who activates it in DBA
  If 11th is weak or not activated, check 9th and 2nd houses for income potential
  8+11 = unearned income, passive income, inheritance (excessive reliance on this without career houses = problem)
  9+11 = rewarding, abundant pay
  5+11 = grace, natural talent — income comes through innate gift without heavy effort
  7th house = business capacity; must have 11th active to actually profit from it
  3rd house = communication, travel, writing, skills (applies to sales, media, online work)
  4th house = home base, land, property; primary indicator for work-from-home when very prominent
  12th house = money invested, foreign connections, hidden assets, spiritual or isolated work

SPECIAL PLANET NOTES:
  Rahu as dasha lord or strong in career houses = technology, foreign work, unconventional career, rapid rise
  Mars strong with military or police house combinations = defense/law enforcement
  Venus prominent with management houses = financial management, luxury goods, arts management
  Jupiter prominent with 5+9+11 = teaching, wisdom, dharmic guidance, philosophy
  Saturn prominent with 4+10+11 = property, discipline-based career, slow but solid rise`;

  const systemPrompt = isLayer2
    ? `You are Jyoti, a Vedic Jyotish master in the Nadi tradition with deep expertise in vocational karma. You have already given this person their career reading. They are now sharing a personal situation, question, or challenge. Respond with precise, grounded guidance that speaks directly to their actual situation through the lens of their natal chart and current DBA period.

${CAREER_RULES}

TONE AND STYLE:
Write in flowing, personal sentences — no lists, no headers, no bullet points. Warm, direct, specific. Like a trusted mentor who truly knows this person's chart and their life situation. Never say "your 10th house" or "your dasha lord" — speak the insight in human language without naming the astrological mechanism. No em dashes (use commas or periods instead), no en dashes, no asterisks, no Markdown of any kind.

Return JSON only in this exact format — no backticks, no code blocks:
{"guidance":"3-4 sentences of personal, chart-grounded guidance addressing their specific situation. Concrete and human. Addresses what they actually asked."}`

    : `You are Jyoti, a Vedic Jyotish master in the Nadi tradition. You are giving a precise vocational reading based on the classical Nadi method of house combination analysis and DBA timing.

${CAREER_SIGNATURES}

${CAREER_RULES}

HOW TO ANALYSE (do this silently before writing):
1. Look at the "DBA CAREER HOUSE ANALYSIS" section — it shows exactly which houses each DBA lord activates (natal position + houses ruled)
2. FOCUS ON ANTAR + PRATYANTARA: career house combinations only manifest as active events when they appear in the Antar and/or Pratyantara Dasha. The Maha Dasha is background context only.
3. Check overlap: which houses appear in BOTH the Antar and Pratyantara columns — those are confirmed active themes right now
4. If a house appears in all THREE levels (Maha + Antar + Pratyantara) — extremely strong, near-certain event
5. Match the Antar + Pratyantara house combinations against the CAREER TYPE SIGNATURES to identify what field is being activated
6. Assess if the Antar + Pratyantara carry positive career houses (2, 6, 7, 10, 11) or challenge houses (5, 8, 12)
7. Note the Pratyantara lord's connections — this is the immediate trigger, active in the current weeks
8. Identify 2-3 vocational strengths from the natal chart (planets in 10th/11th, Atmakaraka/Amatyakaraka, strong planets)
9. Select a mantra appropriate to the planet most relevant to this career situation

WRITING RULES:
Do NOT use the words "house", "lord", "dasha", "natal", "Atmakaraka", or "Amatyakaraka" in the human-readable text fields — speak the insight in natural language. For example: instead of "your 10th lord Saturn is in the 11th house", say something like "Saturn's energy in your chart ties discipline directly to income and social connection."
No em dashes (use commas or periods), no en dashes, no asterisks, no Markdown formatting anywhere.
Write as a mentor who genuinely sees this person — not as an AI generating a list.

Return JSON only in this exact format — no backticks, no code blocks:
{"reading":"3-4 sentences on their vocational picture and what they are built for. Specific to their chart, not generic. Human and direct.","current_period":"2-3 sentences on what the current planetary period (especially the most immediate layer) is opening or testing in career right now. Be specific to what the DBA analysis shows.","timing":"1-2 sentences on how long this period lasts and what career shift comes after it ends.","strengths":["One sentence vocational strength, specific to their chart","One sentence second vocational strength","One sentence third vocational strength"],"mantra":"Sanskrit Devanagari mantra most suited to supporting this person's career dharma","mantra_translit":"Plain Roman transliteration of the mantra","mantra_meaning":"Brief meaning of the mantra in the response language","mantra_count":108}`;

  const userMessage = isLayer2
    ? `Here is the birth chart:\n${chartSummary}\n\nTheir personal situation or question:\n${context || ''}\n\nProvide personal career guidance responding to their specific situation.`
    : `Here is the birth chart with full career house analysis:\n${chartSummary}\n\nProvide a precise Nadi vocational reading.`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 120000);
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
          model: 'claude-haiku-4-5-20251001',
          max_tokens: lang === 'hi' ? 1400 : lang === 'es' ? 1200 : 1000,
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

    if (!response.ok) {
      const err = await response.text().catch(() => '(unreadable)');
      return res.status(502).json({ error: 'API error', detail: err });
    }

    data = await response.json();
    text = data.content?.[0]?.text || '';
    if (!text) return res.status(502).json({ error: 'Empty response from API' });

    let parsed;
    const clean = text.replace(/```json|```/g, '').trim();
    try { parsed = JSON.parse(clean); } catch(_) {}
    if (!parsed) { try { parsed = JSON.parse(clean.replace(/\n/g, ' ').replace(/\r/g, '')); } catch(_) {} }
    if (!parsed) { const m = clean.match(/\{[\s\S]*\}/); if (m) { try { parsed = JSON.parse(m[0]); } catch(_) {} } }
    if (!parsed) { try { parsed = JSON.parse(clean.replace(/[\r\n\t]+/g, ' ')); } catch(_) {} }

    if (!parsed) {
      console.error('Career JSON parse failed. text[:500]:', text.slice(0, 500));
      return res.status(502).json({ error: 'JSON parse error', detail: text ? text.slice(0, 400) : '(empty)' });
    }

    return res.status(200).json(sanitizeDeep(parsed));
  } catch (e) {
    console.error('Career function error:', e);
    return res.status(500).json({ error: 'Internal error', detail: e.message });
  }
};
