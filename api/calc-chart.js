// Vercel Serverless Function — Precise Vedic Chart Calculation
// Uses astronomy-engine (JPL-accuracy) for all planetary positions

const Astronomy = require('astronomy-engine');

function utcOffsetForTZ(ianaZone, localDateStr) {
  try {
    const getOff = dt => {
      const parts = new Intl.DateTimeFormat('en', { timeZone: ianaZone, timeZoneName: 'longOffset' }).formatToParts(dt);
      const s = parts.find(p => p.type === 'timeZoneName')?.value || '';
      const m = s.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
      if (!m) return null;
      return (m[1] === '+' ? 1 : -1) * (parseInt(m[2]) + parseInt(m[3] || 0) / 60);
    };
    // Pass 1: treat local time as UTC → approximate offset
    const dtApprox = new Date(localDateStr + 'Z');
    const off1 = getOff(dtApprox);
    if (off1 === null) return null;
    // Pass 2: subtract offset → closer to true UTC → accurate historical offset (handles DST boundaries)
    const off2 = getOff(new Date(dtApprox.getTime() - off1 * 3600000));
    return off2 ?? off1;
  } catch(e) {}
  return null;
}

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const DASHA_LORDS  = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const DASHA_YEARS  = [7, 20, 6, 10, 7, 18, 16, 19, 17];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { dob, tob, lat, lon, utcOffset, birthTZ } = req.body || {};
    if (!dob) return res.status(400).json({ error: 'Missing dob' });

    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) return res.status(400).json({ error: 'Missing or invalid lat/lon' });

    // Determine UTC offset — prefer client-supplied IANA timezone (historical DST-aware)
    const tp = (tob || '12:00:00').split(':');
    const localStr = `${dob}T${(tp[0]||'12').padStart(2,'0')}:${(tp[1]||'00').padStart(2,'0')}:${(tp[2]||'00').padStart(2,'0')}`;
    let utcOff, _tzMethod = 'lon/15 fallback';
    if (utcOffset !== undefined && utcOffset !== null && utcOffset !== '') {
      utcOff = parseFloat(utcOffset);
      _tzMethod = 'manual';
    } else if (birthTZ) {
      utcOff = utcOffsetForTZ(birthTZ, localStr);
      _tzMethod = `client-tz:${birthTZ}`;
    }
    if (utcOff == null || isNaN(utcOff)) utcOff = Math.round(lonN / 15 * 2) / 2;

    // Parse birth time to UT hours
    const parts = (tob || '12:00:00').split(':').map(Number);
    const localH = (parts[0] || 12) + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600;
    let utH = localH - utcOff;

    // Parse birth date
    const [yr, mo, dy] = dob.split('-').map(Number);

    // Handle day boundary
    let adjDay = dy;
    if (utH < 0)  { utH += 24; adjDay -= 1; }
    if (utH >= 24) { utH -= 24; adjDay += 1; }

    const utHours  = Math.floor(utH);
    const utMins   = Math.floor((utH - utHours) * 60);
    const utSecs   = Math.round(((utH - utHours) * 60 - utMins) * 60);
    const birthDate = new Date(Date.UTC(yr, mo - 1, adjDay, utHours, utMins, utSecs));

    // Julian Day
    const jd = birthDate.getTime() / 86400000 + 2440587.5;
    const T  = (jd - 2451545.0) / 36525;
    const n  = jd - 2451545.0;

    // Lahiri ayanamsa — Swiss Ephemeris Chitrapaksha definition
    // J2000.0 value 23.8563° + IAU precession 50.29"/yr; quadratic term for century-scale accuracy
    const ayanamsa = 23.8563 + T * 1.39691 - 0.000030 * T * T;
    const sid = trop => ((trop - ayanamsa) % 360 + 360) % 360;

    // ── Planetary positions (geocentric tropical ecliptic) via astronomy-engine ──
    const sunTrop  = Astronomy.SunPosition(birthDate).elon;
    const moonTrop = Astronomy.EclipticGeoMoon(birthDate).lon;

    const geoEcl = body => {
      const v = Astronomy.GeoVector(body, birthDate, true);
      return ((Astronomy.Ecliptic(v).elon) % 360 + 360) % 360;
    };
    const marsTrop  = geoEcl('Mars');
    const mercTrop  = geoEcl('Mercury');
    const jupTrop   = geoEcl('Jupiter');
    const venTrop   = geoEcl('Venus');
    const satTrop   = geoEcl('Saturn');

    // Rahu mean node — Meeus Ch.22 (accurate to 0.05°)
    const rahuTrop = ((125.04452 - 1934.13626 * T + 0.002071 * T * T) % 360 + 360) % 360;

    // ── Ascendant via GMST + latitude ──
    const GMST = ((280.46061837 + 360.98564736629 * n + 0.000387933 * T * T) % 360 + 360) % 360;
    const LST  = (GMST + lonN + 360) % 360;
    const oblR = (23.439291111 - 0.013004167 * T) * Math.PI / 180;
    const latR = latN * Math.PI / 180;
    const lstR = LST * Math.PI / 180;
    // ASC = atan2(cos θ, -sin θ·cos ε - tan φ·sin ε)  [standard Placidus/ecliptic horizon formula]
    let ascTrop = Math.atan2(Math.cos(lstR), -Math.sin(lstR) * Math.cos(oblR) - Math.tan(latR) * Math.sin(oblR)) * 180 / Math.PI;
    ascTrop = (ascTrop % 360 + 360) % 360;

    // ── Convert to sidereal ──
    const rahuSid = sid(rahuTrop);
    const ketuSid = (rahuSid + 180) % 360;
    const ascSid  = sid(ascTrop);

    const mk = (name, sym, l) => {
      const nakRaw = l * 27 / 360;
      return {
        name, sym, lon: l,
        sign: Math.floor(l / 30),
        signName: SIGNS[Math.floor(l / 30)],
        degree: (l % 30).toFixed(4),
        nakshatra: Math.floor(nakRaw),
        nakshatraName: NAKSHATRAS[Math.floor(nakRaw)],
        pada: Math.floor(nakRaw % 1 * 4) + 1
      };
    };

    const planets = [
      mk('Sun',     '☉', sid(sunTrop)),
      mk('Moon',    '☽', sid(moonTrop)),
      mk('Mars',    '♂', sid(marsTrop)),
      mk('Mercury', '☿', sid(mercTrop)),
      mk('Jupiter', '♃', sid(jupTrop)),
      mk('Venus',   '♀', sid(venTrop)),
      mk('Saturn',  '♄', sid(satTrop)),
      mk('Rahu',    '☊', rahuSid),
      mk('Ketu',    '☋', ketuSid)
    ];

    const asc = {
      lon: ascSid,
      sign: Math.floor(ascSid / 30),
      signName: SIGNS[Math.floor(ascSid / 30)],
      degree: (ascSid % 30).toFixed(4)
    };

    // ── Malefic detection ──
    const ang = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    const malefics = [];
    if (ang(planets[1].lon, planets[6].lon) < 30) malefics.push({ name: 'Saturn–Moon conjunction', house: planets[1].sign + 1, severity: 'moderate' });
    if (ang(planets[1].lon, rahuSid) < 45)        malefics.push({ name: 'Rahu–Moon influence',     house: planets[1].sign + 1, severity: 'strong' });
    if (ang(ketuSid, ascSid) < 30)                malefics.push({ name: 'Ketu near Ascendant',      house: 1, severity: 'moderate' });
    if (planets[2].sign === (asc.sign + 7) % 12)  malefics.push({ name: 'Mars in 8th House',        house: 8, severity: 'strong' });
    if (!malefics.length) {
      const ss = (planets[6].lon - planets[1].lon + 360) % 360;
      malefics.push(ss < 30 || ss > 330
        ? { name: 'Sade Sati — Saturn near Moon', house: planets[1].sign + 1, severity: 'moderate' }
        : { name: 'Saturn aspects 7th house',      house: 7, severity: 'mild' });
    }

    // ── Vimshottari Dasha — three tiers (Maha / Antar / Pratyantara) ──
    //
    // Algorithm:
    //   1. The Moon's nakshatra (and its fractional progress) tells us which
    //      Maha Dasha was active at birth and how much had already elapsed.
    //   2. From the exact Maha-start date we walk forward through complete
    //      Maha periods until we arrive at today's Maha Dasha and its
    //      calendar start date.
    //   3. Within that Maha Dasha the Antar (sub-period) sequence begins with
    //      the same lord, each Antar duration = (mahaYrs × antarYrs) / 120.
    //      We walk forward until today's Antar and its calendar start.
    //   4. Same logic one level deeper for Pratyantara (sub-sub-period):
    //      each duration = (antarDuration × pratYrs) / 120.
    //
    const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

    const moonNakIdx   = planets[1].nakshatra;
    const moonNakFrac  = (planets[1].lon * 27 / 360) % 1;  // [0,1) progress through nakshatra
    const birthLordIdx = moonNakIdx % 9;

    // How many years of the birth Maha Dasha had already elapsed before birth
    const elapsedAtBirth  = moonNakFrac * DASHA_YEARS[birthLordIdx];
    // The birth Maha Dasha started this many years before birth
    const birthMahaStart  = new Date(birthDate.getTime() - elapsedAtBirth * MS_PER_YEAR);

    // ── Tier 1: current Maha Dasha ──
    const nowMs   = Date.now();
    let mahaIdx   = birthLordIdx;
    let mahaStart = birthMahaStart;

    while (mahaStart.getTime() + DASHA_YEARS[mahaIdx] * MS_PER_YEAR <= nowMs) {
      mahaStart = new Date(mahaStart.getTime() + DASHA_YEARS[mahaIdx] * MS_PER_YEAR);
      mahaIdx   = (mahaIdx + 1) % 9;
    }
    const mahaEnd       = new Date(mahaStart.getTime() + DASHA_YEARS[mahaIdx] * MS_PER_YEAR);
    const mahaRemaining = (mahaEnd.getTime() - nowMs) / MS_PER_YEAR;

    // ── Tier 2: current Antar Dasha (Bhukti) ──
    // Sequence starts with the same lord as the Maha Dasha
    let antarIdx   = mahaIdx;
    let antarStart = mahaStart;

    while (true) {
      const dur = (DASHA_YEARS[mahaIdx] * DASHA_YEARS[antarIdx]) / 120;
      const end = antarStart.getTime() + dur * MS_PER_YEAR;
      if (end > nowMs) break;
      antarStart = new Date(end);
      antarIdx   = (antarIdx + 1) % 9;
    }
    const antarDuration  = (DASHA_YEARS[mahaIdx] * DASHA_YEARS[antarIdx]) / 120;
    const antarEnd       = new Date(antarStart.getTime() + antarDuration * MS_PER_YEAR);
    const antarRemaining = (antarEnd.getTime() - nowMs) / MS_PER_YEAR;

    // ── Tier 3: current Pratyantara Dasha (Sookshma) ──
    // Sequence starts with the same lord as the Antar Dasha
    let pratIdx   = antarIdx;
    let pratStart = antarStart;

    while (true) {
      const dur = (antarDuration * DASHA_YEARS[pratIdx]) / 120;
      const end = pratStart.getTime() + dur * MS_PER_YEAR;
      if (end > nowMs) break;
      pratStart = new Date(end);
      pratIdx   = (pratIdx + 1) % 9;
    }
    const pratDuration  = (antarDuration * DASHA_YEARS[pratIdx]) / 120;
    const pratEnd       = new Date(pratStart.getTime() + pratDuration * MS_PER_YEAR);
    const pratRemaining = (pratEnd.getTime() - nowMs) / MS_PER_YEAR;

    // Format helper — short date string e.g. "21 Jul 2025"
    const fmtDate = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const dashaPeriod = {
      // Maha Dasha — kept at top level for backward compat
      lord:      DASHA_LORDS[mahaIdx],
      years:     DASHA_YEARS[mahaIdx],
      remaining: mahaRemaining.toFixed(2),
      next:      DASHA_LORDS[(mahaIdx + 1) % 9],
      endDate:   fmtDate(mahaEnd),
      // Antar Dasha (Bhukti / sub-period)
      antar: {
        lord:      DASHA_LORDS[antarIdx],
        duration:  antarDuration.toFixed(3),
        remaining: antarRemaining.toFixed(2),
        next:      DASHA_LORDS[(antarIdx + 1) % 9],
        startDate: fmtDate(antarStart),
        endDate:   fmtDate(antarEnd)
      },
      // Pratyantara Dasha (sub-sub-period)
      pratyantara: {
        lord:      DASHA_LORDS[pratIdx],
        duration:  pratDuration.toFixed(3),
        remaining: pratRemaining.toFixed(2),
        next:      DASHA_LORDS[(pratIdx + 1) % 9],
        startDate: fmtDate(pratStart),
        endDate:   fmtDate(pratEnd)
      }
    };

    return res.status(200).json({
      planets, asc, malefics, dashaPeriod,
      sunSign:  planets[0].sign,
      moonSign: planets[1].sign,
      moonNak:  planets[1].nakshatra,
      ascSign:  asc.sign,
      ayanamsa: ayanamsa.toFixed(6),
      birthUT:  birthDate.toISOString(),
      _coords:  { lat: latN, lon: lonN },
      _utcOff:  utcOff,
      _birthTZ: birthTZ || null,
      _tzMethod
    });

  } catch (e) {
    console.error('calc-chart error:', e);
    return res.status(500).json({ error: 'Calculation failed', detail: e.message });
  }
};
