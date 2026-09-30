/**
 * Normalizes text content while safely preserving mathematical / LaTeX notation.
 */

// Comprehensive mapping of HTML entities to decoded Unicode characters
const HTML_ENTITIES: Record<string, string> = {
  // Basic XML/HTML
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&nbsp;': ' ',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&#x27;': "'",
  '&#x2F;': '/',
  '&#43;': '+',
  '&#61;': '=',

  // Math operators & relations
  '&le;': '≤',
  '&ge;': '≥',
  '&ne;': '≠',
  '&pm;': '±',
  '&plusmn;': '±',
  '&times;': '×',
  '&divide;': '÷',
  '&asymp;': '≈',
  '&equiv;': '≡',
  '&prop;': '∝',
  '&infin;': '∞',
  '&deg;': '°',
  '&int;': '∫',
  '&sum;': '∑',
  '&radic;': '√',
  '&part;': '∂',
  '&nabla;': '∇',
  '&isin;': '∈',
  '&notin;': '∉',
  '&sub;': '⊂',
  '&sup;': '⊃',
  '&cup;': '∪',
  '&cap;': '∩',
  '&perp;': '⊥',
  '&ang;': '∠',
  '&cong;': '≅',
  '&there4;': '∴',

  // Arrows
  '&rarr;': '→',
  '&larr;': '←',
  '&harr;': '↔',
  '&rArr;': '⇒',
  '&lArr;': '⇐',
  '&hArr;': '⇔',

  // Greek letters (uppercase & lowercase)
  '&Alpha;': 'Α',
  '&alpha;': 'α',
  '&Beta;': 'Β',
  '&beta;': 'β',
  '&Gamma;': 'Γ',
  '&gamma;': 'γ',
  '&Delta;': 'Δ',
  '&delta;': 'δ',
  '&Epsilon;': 'Ε',
  '&epsilon;': 'ε',
  '&Zeta;': 'Ζ',
  '&zeta;': 'ζ',
  '&Eta;': 'Η',
  '&eta;': 'η',
  '&Theta;': 'Θ',
  '&theta;': 'θ',
  '&Iota;': 'Ι',
  '&iota;': 'ι',
  '&Kappa;': 'Κ',
  '&kappa;': 'κ',
  '&Lambda;': 'Λ',
  '&lambda;': 'λ',
  '&Mu;': 'Μ',
  '&mu;': 'μ',
  '&Nu;': 'Ν',
  '&nu;': 'ν',
  '&Xi;': 'Ξ',
  '&xi;': 'ξ',
  '&Omicron;': 'Ο',
  '&omicron;': 'ο',
  '&Pi;': 'Π',
  '&pi;': 'π',
  '&Rho;': 'Ρ',
  '&rho;': 'ρ',
  '&Sigma;': 'Σ',
  '&sigma;': 'σ',
  '&Tau;': 'Τ',
  '&tau;': 'τ',
  '&Upsilon;': 'Υ',
  '&upsilon;': 'υ',
  '&Phi;': 'Φ',
  '&phi;': 'φ',
  '&Chi;': 'Χ',
  '&chi;': 'χ',
  '&Psi;': 'Ψ',
  '&psi;': 'ψ',
  '&Omega;': 'Ω',
  '&omega;': 'ω',
};

export function cleanText(input: string | null | undefined): string {
  if (!input) return '';

  let text = input;

  // 1. Replace <br> variants with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // 2. Decode HTML entities
  for (const [entity, replacement] of Object.entries(HTML_ENTITIES)) {
    text = text.replaceAll(entity, replacement);
  }

  // 3. Decode numerical entities &#123; or &#x1f;
  text = text.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return '';
    }
  });
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return '';
    }
  });

  // 4. Strip layout/wrapper HTML tags while preserving LaTeX/content
  text = text.replace(/<\/?(p|span|div|b|i|strong|em|center|font|table|tr|td|th|tbody|thead)[^>]*>/gi, '');

  // 5. Remove zero-width spaces and control characters
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 6. Normalize multiple consecutive newlines (max 2) and spaces
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return text.trim();
}

/**
 * Normalizes strings for deterministic duplicate hashing.
 */
export function normalizeForHash(text: string): string {
  return cleanText(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
