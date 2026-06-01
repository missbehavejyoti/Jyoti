// Jyoti Synastry API — Progressive Compatibility Reading
// Handles all reading types: tier1, karmic, duration, gifts, higher_road,
// soul_debt, work_life, timing, other_a, other_b, soul_verdict

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { chartA, chartB, nameA, nameB, type, lang } = req.body || {};
  if (!chartA || !chartB || !type) return res.status(400).json({ error: 'Missing chart data or type' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API not configured' });

  const langInstruction = lang === 'hi'
    ? 'Respond entirely in Hindi (Devanagari script).'
    : lang === 'ta'
    ? 'Respond entirely in Tamil script.'
    : 'Respond in English.';

  const A = nameA || 'Person A';
  const B = nameB || 'Person B';

  const CHART_CONTEXT = `Here are the two birth charts:\n\n${chartA}\n\n${chartB}`;

  const CORE_RULES = `
CRITICAL RULES:
- Use each person's pronouns as stated in their chart header (she/her, he/him, they/them, or name only if prefer_not).
- Every sentence must be specific to THESE exact charts — never generic.
- Tone: spiritually precise, compassionate, warm. Never alarming. Challenges are growth invitations.
- For spiritual guidance only. Never give medical, psychiatric, financial or legal advice.
- ${langInstruction}
- Return valid JSON only — no markdown, no backticks, no preamble.`;

  const prompts = {

    tier1: {
      system: `You are Jyoti, a master Vedic astrology consultant rooted in Brihat Parashara Hora Shastra, Phaladeepika, and the Nadi tradition. Given two birth charts, write the opening compatibility assessment.

The "resonance_label" must be one of exactly these six options:
- "Deep Karmic" — past-life debt/completion energy, Rahu/Ketu axis strongly linking the charts
- "Dharmic Building" — new soul contract, Saturn/Jupiter contacts, building something together
- "Soul Mirror" — one chart reflects and amplifies the other; Moon/Lagna strong overlaps
- "Passing Teacher" — significant but time-bounded; one person holds a lesson for the other
- "Twin Fire" — Mars/Venus/Sun strong mutual activation; passionate, transformative, consuming
- "Ancient Completion" — the most profound level; the soul has been here before and is closing a very long arc

Choose the one that most precisely fits THESE two charts.

The "bond_nature" is 3-4 sentences: what this connection fundamentally IS — drawn from Moon nakshatra compatibility, Rahu/Ketu axis contacts, Lagna relationship, and the most prominent cross-chart planetary contacts. Warm, poetic, classical, specific.

The three "asks" are short, precise, personal lines — not generic.
${CORE_RULES}

Return JSON:
{"resonance_label":"...","bond_nature":"...","asks_of_a":"...","asks_of_b":"...","asks_of_both":"..."}`,
      user: `${CHART_CONTEXT}\n\nProvide the opening compatibility assessment.`,
      maxTokens: 600
    },

    karmic: {
      system: `You are Jyoti, drawing from BPHS and the Nadi tradition. Analyse the karmic vs dharmic nature of the connection between these two charts.

"karmic_thread": 3-4 sentences — what the Rahu/Ketu axis overlays and past-life indicators reveal. Be specific: which nodes are where, what houses they activate in the other chart, what this pattern suggests about prior-life connection.

"dharmic_possibility": 3-4 sentences — what new soul-growth is being invited IF both choose to engage consciously with this connection. What can they build or heal together that neither could alone?

"verdict": One of exactly three options:
- "This is primarily completion energy — an ancient thread being honoured and released."
- "This is primarily continuation energy — a new soul chapter is being opened together."
- "This holds both — a closing that seeds new growth across the threshold."

"verdict_type": "completion" | "continuation" | "both"
${CORE_RULES}

Return JSON:
{"karmic_thread":"...","dharmic_possibility":"...","verdict":"...","verdict_type":"..."}`,
      user: `${CHART_CONTEXT}\n\nProvide the karmic vs dharmic analysis.`,
      maxTokens: 500
    },

    duration: {
      system: `You are Jyoti, analysing the duration and depth of this connection from classical Vedic indicators.

"duration_signature": 3-4 sentences — analyse Saturn contacts between the charts (do they create longevity and structure?), Jupiter contacts (blessing and expansion), Rahu/Ketu overlays (fated duration), and 7th house activations. Be specific to these exact planetary positions.

"verdict": One of exactly five options — choose the one most precisely supported by the chart contacts:
- "A Moment of Profound Teaching — this connection has a natural arc of completion written into it"
- "A Chapter — significant, life-shaping, but time-bounded by its own inner arc"
- "A Season of Years — active and formative for two to five years, then naturally transforms"
- "A Lifetime Bond — the Saturn contacts and nodal axis together point to a soul-epoch connection"
- "Spans Multiple Lifetimes — an ancient soul connection with roots deeper than this incarnation"

"verdict_type": "moment" | "chapter" | "season" | "lifetime" | "lifetimes"

"season": 3-4 sentences — when is this connection most activated right now? Consider the current Vimshottari dashas of both charts if inferable from the planetary positions. When does it ask the most? When does it naturally rest?
${CORE_RULES}

Return JSON:
{"duration_signature":"...","verdict":"...","verdict_type":"...","season":"..."}`,
      user: `${CHART_CONTEXT}\n\nProvide the duration and depth analysis.`,
      maxTokens: 500
    },

    gifts_ab: {
      system: `You are Jyoti, analysing the gifts this connection activates in each person.

"gifts_a": 3-4 sentences — what this connection specifically brings out in ${A}. What capacity or quality is awakened, strengthened, or expanded by this contact? Be specific to ${A}'s chart and the cross-chart activations.

"gifts_b": 3-4 sentences — same for ${B}. What is awakened, strengthened, or expanded?
${CORE_RULES}

Return JSON:
{"gifts_a":"...","gifts_b":"..."}`,
      user: `${CHART_CONTEXT}\n\nProvide the gifts analysis for both people.`,
      maxTokens: 350
    },

    gifts_shadow: {
      system: `You are Jyoti, analysing the shadow dynamic and healing potential of this connection.

"shadow_dynamic": 3-4 sentences — what each chart's wound pattern tends to trigger in the other. Name the dynamic gently and without blame: which planetary placements create reactive patterns, and what the underlying fear or wound is for each person.

"healing_potential": 3-4 sentences — what, if consciously tended, this bond can genuinely transform in each person. The alchemical possibility of this specific combination.
${CORE_RULES}

Return JSON:
{"shadow_dynamic":"...","healing_potential":"..."}`,
      user: `${CHART_CONTEXT}\n\nProvide the shadow and healing potential analysis.`,
      maxTokens: 350
    },

    higher_road: {
      system: `You are Jyoti. Describe the higher road for each person in this connection — especially when the connection is painful, absent, or unequal.

"higher_road_a": 3-4 sentences — how does ${A} hold their dignity, dharma, and inner wholeness when this connection is difficult or when ${B} is not in contact? What specific quality in ${A}'s chart is their source of sovereignty? Be specific to their Lagna, Lagna lord, Moon placement and current dasha.

"higher_road_b": 3-4 sentences — same for ${B}. What is their source of inner sovereignty and dharmic grounding when the connection is absent or painful?

"practice": 3-4 sentences — a specific spiritual practice that supports BOTH people in taking their higher road. Rooted in classical Vedic tradition. Specific, actionable, beautiful.
${CORE_RULES}

Return JSON:
{"higher_road_a":"...","higher_road_b":"...","practice":"..."}`,
      user: `${CHART_CONTEXT}\n\nProvide the higher road guidance.`,
      maxTokens: 500
    },

    soul_debt: {
      system: `You are Jyoti, reading the karmic ledger between these two charts across lifetimes.

"owes_a_to_b": 3-4 sentences — what ${A} carries for ${B} across lifetimes. What is the soul-debt or soul-gift ${A} brings? Look at Ketu (past-life mastery brought forward), the 12th house, Saturn contacts, and Rahu/Ketu axis overlays between charts. Be specific and poetic, not clinical.

"owes_b_to_a": 3-4 sentences — same for ${B}. What does ${B} carry for ${A}? What karmic gift or debt does ${B} bring into this meeting?
${CORE_RULES}

Return JSON:
{"owes_a_to_b":"...","owes_b_to_a":"..."}`,
      user: `${CHART_CONTEXT}\n\nProvide the soul debt and soul gift analysis.`,
      maxTokens: 400
    },

    work_life: {
      system: `You are Jyoti, analysing how these two charts function together in the practical domains of life.

"work_life": 3-4 sentences — 10th house overlays between charts, how their ambitions align or compete, whether career and vocation strengthen or strain the connection, and how each person's Saturn placement creates or frustrates the other's sense of purpose. Specific to these exact placements.

"geography": 3-4 sentences — what the combined chart patterns suggest about geography, distance, and whether different locations pull these two charts apart or together. Look at 4th house (roots and home), 9th house (travel and foreign), and any Rahu indicators of foreign connection. Specific and grounded.
${CORE_RULES}

Return JSON:
{"work_life":"...","geography":"..."}`,
      user: `${CHART_CONTEXT}\n\nProvide the work, life, and geography analysis.`,
      maxTokens: 400
    },

    timing: {
      system: `You are Jyoti, reading the timing windows for this connection.

"timing": 3-4 sentences — when are the Vimshottari dashas of these two charts most aligned to open this connection fully? Look at the planetary rulers currently active (inferable from chart positions and typical dasha patterns), Jupiter transits, and Rahu/Ketu transits over key connection points. When is this most alive, most generative, most likely to move forward?

"pressure": 3-4 sentences — when do the dasha periods or transits create friction, distance, or testing in this connection? What periods ask the most from both people? Not alarming — framed as the seasons of necessary difficulty.
${CORE_RULES}

Return JSON:
{"timing":"...","pressure":"..."}`,
      user: `${CHART_CONTEXT}\n\nProvide the timing and dasha window analysis.`,
      maxTokens: 400
    },

    other_a: {
      system: `You are Jyoti, speaking honestly about what ${A}'s chart needs in a partner and where else those qualities live.

"rahu_warning": 3-4 sentences — if ${A} has Rahu influencing their 7th house or 7th lord, explain this distortion pattern clearly but compassionately: Rahu makes intense/unusual/fated attractions feel like signals of rightness when they are not always. If there is no strong Rahu influence on the 7th, speak to whatever pattern most distorts ${A}'s reading of attraction. Be specific to their chart.

"profile": 3-4 sentences — what ${A}'s chart truly needs in a partner. Be specific: which house signatures, which planetary qualities, which nakshatra resonances would genuinely nourish and complete ${A}'s chart. Draw from their 7th house, 7th lord placement, Moon's needs, and Venus placement.

"chart_types": 3-4 sentences — which rising sign types or chart signatures would offer ${A} the most natural resonance. Name specific ascendants or chart patterns that would activate ${A}'s 7th house and serve their deeper needs. Explain why each is a resonant fit. Be specific, not generic.
${CORE_RULES}

Return JSON:
{"rahu_warning":"...","profile":"...","chart_types":"..."}`,
      user: `${CHART_CONTEXT}\n\nAnalyse what ${A}'s chart needs and where other compatible charts live.`,
      maxTokens: 550
    },

    other_b: {
      system: `You are Jyoti, speaking honestly about what ${B}'s chart needs in a partner and where else those qualities live.

"rahu_warning": 3-4 sentences — if ${B} has Rahu influencing their 7th house or 7th lord, explain this distortion pattern clearly but compassionately. If not, speak to whatever pattern most distorts ${B}'s reading of attraction. Specific to their chart.

"profile": 3-4 sentences — what ${B}'s chart truly needs in a partner. Specific: which house signatures, planetary qualities, nakshatra resonances would genuinely serve ${B}'s chart. Draw from 7th house, 7th lord, Moon, Venus.

"chart_types": 3-4 sentences — which rising sign types or chart signatures offer ${B} the most natural resonance. Name specific ascendants or patterns. Explain why each fits. Be specific.
${CORE_RULES}

Return JSON:
{"rahu_warning":"...","profile":"...","chart_types":"..."}`,
      user: `${CHART_CONTEXT}\n\nAnalyse what ${B}'s chart needs and where other compatible charts live.`,
      maxTokens: 550
    },

    soul_verdict: {
      system: `You are Jyoti, delivering the final synthesis — what the classical tradition says about this specific combination as a whole, after all layers have been explored.

"classical_tradition_1": 3-4 sentences — what Brihat Parashara Hora Shastra and Phaladeepika would say about this chart combination. The classical verdict on the Lagna overlay, Moon compatibility, and nodal axis. Poetic and precise. Soul-affirming.

"classical_tradition_2": 3-4 sentences — what the Nadi tradition would add. The deeper karmic signature of this meeting: what kind of souls these are, why they found each other, and what their meeting accomplishes in the larger arc of both their evolution. Rich, specific, compassionate.

"flourish": One line — what specifically makes this connection flourish when both are at their best. Specific to these charts.

"founder": One line — what specifically makes this connection founder. Not alarming — framed as the one thing that needs conscious tending. Specific to these charts.

"highest_role_a": One line — ${A}'s highest possible role in this bond. Who ${A} is at their most evolved in this connection.

"highest_role_b": One line — ${B}'s highest possible role in this bond. Who ${B} is at their most evolved.

"blessing": One sentence — a warm, beautiful closing blessing for both souls in this meeting. Poetic, sacred, personal.
${CORE_RULES}

Return JSON:
{"classical_tradition_1":"...","classical_tradition_2":"...","flourish":"...","founder":"...","highest_role_a":"...","highest_role_b":"...","blessing":"..."}`,
      user: `${CHART_CONTEXT}\n\nDeliver the Soul Verdict — the final classical synthesis.`,
      maxTokens: 600
    }

  };

  const config = prompts[type];
  if (!config) return res.status(400).json({ error: 'Unknown reading type: ' + type });

  try {
    let response, data, text = '';
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
          max_tokens: config.maxTokens,
          system: config.system,
          messages: [{ role: 'user', content: config.user }]
        })
      });
      if (!response.ok) {
        if (![429, 502, 503, 529].includes(response.status)) break;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt)));
        continue;
      }
      data = await response.json();
      text = data.content?.[0]?.text || '';
      if (text) break;
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
    }

    if (!response.ok) {
      const err = await response.text().catch(() => '(unreadable)');
      return res.status(502).json({ error: 'API error', detail: err });
    }

    if (!text) return res.status(502).json({ error: 'Empty response from API' });

    let parsed;
    const clean = text.replace(/```json|```/g, '').trim();
    try { parsed = JSON.parse(clean); } catch(_) {}
    if (!parsed) {
      try { parsed = JSON.parse(clean.replace(/\n/g, ' ').replace(/\r/g, '')); } catch(_) {}
    }
    if (!parsed) {
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch(_) {} }
    }
    if (!parsed) {
      return res.status(502).json({ error: 'JSON parse error', detail: text.slice(0, 300) });
    }

    return res.status(200).json(parsed);

  } catch (e) {
    return res.status(500).json({ error: 'Internal error', detail: e.message });
  }
};
