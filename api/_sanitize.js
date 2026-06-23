// Strips em dashes, en dashes, and asterisks from AI output — relying on prompt
// instructions alone isn't reliable enough, so this is a hard guarantee applied after generation.

function stripDashes(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1 to $2')   // number/date ranges: 2020–2024 → 2020 to 2024
    .replace(/\s*[–—]\s*/g, ', ')                  // em/en dash used as a clause separator
    .replace(/(\S)\s+-\s+(\S)/g, '$1, $2')                   // spaced hyphen used as a dash substitute
    .replace(/,\s*,/g, ',')                                  // collapse doubled commas
    .replace(/\s+,/g, ',');                                  // no space before comma
}

function stripAsterisks(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // **bold** markdown
    .replace(/\*([^*\n]+)\*/g, '$1')     // *italic* markdown
    .replace(/\*/g, '');                  // any remaining stray asterisks
}

function sanitize(text) {
  return stripAsterisks(stripDashes(text));
}

function sanitizeDeep(value) {
  if (typeof value === 'string') return sanitize(value);
  if (Array.isArray(value)) return value.map(sanitizeDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = sanitizeDeep(value[k]);
    return out;
  }
  return value;
}

// When the model hits its max_tokens cap mid-sentence, trim back to the last
// complete sentence rather than showing readers a reading that stops mid-word.
// Only called when the API itself reports truncation (stop_reason === 'max_tokens') —
// a complete response with unconventional trailing punctuation is left untouched.
function trimIfTruncated(text, stopReason) {
  if (stopReason !== 'max_tokens' || typeof text !== 'string') return text;
  const trimmed = text.trimEnd();
  if (/[.!?।…”"')\]]$/.test(trimmed)) return trimmed;
  const lastBoundary = Math.max(
    trimmed.lastIndexOf('. '), trimmed.lastIndexOf('! '), trimmed.lastIndexOf('? '),
    trimmed.lastIndexOf('।'), trimmed.lastIndexOf('.\n'), trimmed.lastIndexOf('\n')
  );
  return lastBoundary > 0 ? trimmed.slice(0, lastBoundary + 1).trimEnd() : trimmed;
}

module.exports = { stripDashes, stripAsterisks, sanitize, sanitizeDeep, trimIfTruncated };
