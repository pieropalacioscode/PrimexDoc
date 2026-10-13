// frontend/src/utils/textFormatter.ts
//
// Parseo PURO de texto de examen (sin JSX, sin dependencias de React).
// Convierte un string crudo — tal como sale de PostgreSQL / Excel — en una
// lista de "bloques" (párrafos o listas), y cada bloque en una lista de
// "tokens" (texto normal, fracción, exponente o fórmula). Al ser funciones
// puras, se testean con Jest/Vitest de forma aislada, sin renderizar nada.
//
// Componentes que consumen esto: src/components/exam/QuestionText.tsx
//
// Diseñado para adaptarse a distintos tipos de pregunta:
//   - Matemáticas: fracciones (1/2), exponentes (x^2, 10^-3)
//   - Ciencias:    fórmulas simples (H2O, CO2, NaCl, C6H12O6)
//   - Lenguaje/Geografía/Historia: listas de premisas en numeración
//     arábiga (1.), romana (i., ii.) o alfabética (a), b)) y viñetas (•, -)

// ============================================================
// Tipos
// ============================================================

export type MarkerType = 'bullet' | 'numeric' | 'roman' | 'alpha';

export type TextToken =
  | { type: 'text'; value: string }
  | { type: 'fraction'; numerator: string; denominator: string }
  | { type: 'exponent'; base: string; exponent: string }
  | { type: 'formula'; value: string };

export type TextBlock =
  | { type: 'paragraph'; tokens: TextToken[] }
  | { type: 'list'; marker: MarkerType; items: TextToken[][] };

// ============================================================
// 1. Normalización (limpieza de OCR / copy-paste / Excel)
// ============================================================

// "pala-\nbra" -> "palabra" (palabras cortadas por guion al saltar de línea)
const HYPHEN_LINE_BREAK = /(\p{L})-\n(\p{L})/gu;

// Colapsa espacios/tabs repetidos, pero NUNCA toca saltos de línea aquí.
const MULTI_SPACE = /[ \t]{2,}/g;

// Espacios sueltos al final de cada línea.
const TRAILING_SPACE = /[ \t]+$/gm;

// Más de 2 saltos de línea seguidos (con o sin espacios entre medio) -> 2.
const MULTI_BLANK_LINES = /\n[ \t]*\n[ \t]*\n+/g;

// Comillas y guiones "inteligentes" que a veces llegan mal codificados.
const SMART_QUOTES: Array<[RegExp, string]> = [
  [/[\u2018\u2019]/g, "'"],
  [/[\u201C\u201D]/g, '"'],
  [/[\u2013\u2014]/g, '-'],
];

/**
 * Limpia un texto crudo antes de tokenizarlo: normaliza saltos de línea,
 * repara palabras cortadas por guion, colapsa espacios y comprime saltos
 * de línea huérfanos. No toca el contenido semántico (no reordena nada).
 */
export function normalizeRawText(raw: string | null | undefined): string {
  if (!raw) return '';

  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  text = text.replace(HYPHEN_LINE_BREAK, '$1$2');

  for (const [pattern, replacement] of SMART_QUOTES) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(MULTI_SPACE, ' ')
    .replace(TRAILING_SPACE, '')
    .replace(MULTI_BLANK_LINES, '\n\n');

  return text.trim();
}

// ============================================================
// 2. Detección de marcadores de lista
// ============================================================

interface MarkerMatch {
  marker: MarkerType;
  content: string;
}

// El orden importa: se evalúa de arriba hacia abajo y se toma la primera
// coincidencia. "numeric" y "roman" van antes que "alpha" porque letras
// como "i", "v", "x" también calzarían con el patrón alfabético.
const MARKER_PATTERNS: Array<{ marker: MarkerType; regex: RegExp }> = [
  { marker: 'numeric', regex: /^(\d{1,3})[.)]\s+(.*)$/ },
  { marker: 'roman', regex: /^([ivxlcdmIVXLCDM]{1,7})[.)]\s+(.*)$/ },
  { marker: 'alpha', regex: /^([a-zA-Z])[.)]\s+(.*)$/ },
  // "•", "●", "▪", "◦", "‣", "·" son viñetas inequívocas.
  // "-" solo cuenta como viñeta si va seguido de un espacio, para no
  // confundir un guion con un número negativo como "-5" o "-1/2".
  { marker: 'bullet', regex: /^(?:[•●▪◦‣·]\s*|-\s+)(.*)$/ },
];

/**
 * Intenta reconocer si una línea empieza con un marcador de lista
 * (numérico, romano, alfabético o viñeta) y devuelve el tipo + el
 * contenido restante (sin el marcador).
 */
function matchMarker(line: string): MarkerMatch | null {
  for (const { marker, regex } of MARKER_PATTERNS) {
    const match = line.match(regex);
    if (!match) continue;

    // Para numeric/roman/alpha el contenido queda en el grupo 2;
    // para bullet, en el grupo 1.
    const content = marker === 'bullet' ? match[1] : match[2];
    return { marker, content: (content ?? '').trim() };
  }
  return null;
}

// ============================================================
// 3. Tokenización de contenido matemático/científico
// ============================================================

// Un único regex "maestro" con grupos nombrados evita escanear el mismo
// texto varias veces y evita que dos patrones distintos se "peleen" por
// el mismo tramo de string (p. ej. una fracción dentro de un exponente).
//
//   frac    ->  1/2, 20/3          (con guardas para no comerse fechas 12/05)
//   exp     ->  x^2, 2^10, 10^-3
//   formula ->  H2O, CO2, NaCl, C6H12O6  (requiere al menos un dígito para
//               no confundir siglas normales como "ADN" o "PBI")
const MASTER_TOKEN_REGEX = new RegExp(
  [
    '(?<frac>(?<![\\d/])(?<fracNum>\\d{1,3})/(?<fracDen>\\d{1,3})(?!\\d*/))',
    '(?<exp>(?<expBase>[A-Za-z0-9]+)\\^(?<expPow>-?[A-Za-z0-9]+))',
    '(?<formula>(?=[A-Za-z0-9]*\\d)(?:[A-Z][a-z]?\\d{0,2}){2,})',
  ].join('|'),
  'g'
);

/**
 * Divide un texto plano (una línea, sin \n) en tokens de texto normal,
 * fracción, exponente o fórmula. Es la versión "inteligente" que
 * reemplaza a tokenizeFractions, ahora consciente de más tipos de
 * contenido (útil para preguntas de matemáticas y ciencias).
 */
export function tokenizeContent(text: string): TextToken[] {
  if (!text) return [];

  const tokens: TextToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  MASTER_TOKEN_REGEX.lastIndex = 0;
  while ((match = MASTER_TOKEN_REGEX.exec(text)) !== null) {
    const { index } = match;
    const groups = match.groups ?? {};

    if (index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, index) });
    }

    if (groups.frac !== undefined) {
      tokens.push({
        type: 'fraction',
        numerator: groups.fracNum ?? '',
        denominator: groups.fracDen ?? '',
      });
    } else if (groups.exp !== undefined) {
      tokens.push({
        type: 'exponent',
        base: groups.expBase ?? '',
        exponent: groups.expPow ?? '',
      });
    } else if (groups.formula !== undefined) {
      tokens.push({ type: 'formula', value: groups.formula });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', value: text }];
}

/**
 * @deprecated Usa `tokenizeContent`. Se mantiene por compatibilidad con
 * código existente que solo espera fracciones.
 */
export function tokenizeFractions(text: string): TextToken[] {
  return tokenizeContent(text);
}

// ============================================================
// 4. Armado de bloques (párrafos y listas)
// ============================================================

/**
 * Convierte un texto crudo (con \n, viñetas/numeración y contenido
 * matemático/científico embebido) en bloques listos para renderizar.
 *
 * Reglas:
 *  - Cada línea no vacía es su propia unidad semántica: no se fusionan
 *    líneas consecutivas en un párrafo largo, porque el contenido ya
 *    viene curado línea por línea desde la fuente oficial (Excel/PDF).
 *  - Líneas consecutivas con el MISMO tipo de marcador (todas numéricas,
 *    todas romanas, todas alfabéticas o todas viñetas) se agrupan en un
 *    solo bloque `list`. Si el tipo de marcador cambia, se cierra la
 *    lista anterior y se abre una nueva.
 *  - Líneas en blanco solo actúan como separador visual; no generan
 *    bloques vacíos (el margen entre bloques ya da el espacio).
 */
export function parseTextBlocks(rawText: string | null | undefined): TextBlock[] {
  const normalized = normalizeRawText(rawText);
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const blocks: TextBlock[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const markerMatch = matchMarker(line);

    if (markerMatch) {
      const itemTokens = tokenizeContent(markerMatch.content);
      const lastBlock = blocks[blocks.length - 1];

      if (lastBlock?.type === 'list' && lastBlock.marker === markerMatch.marker) {
        lastBlock.items.push(itemTokens);
      } else {
        blocks.push({ type: 'list', marker: markerMatch.marker, items: [itemTokens] });
      }
    } else {
      blocks.push({ type: 'paragraph', tokens: tokenizeContent(line) });
    }
  }

  return blocks;
}

// ============================================================
// 5. Utilidad de conveniencia (compatibilidad con smartFormatter)
// ============================================================

/**
 * Devuelve el texto ya normalizado como string plano, para los casos en
 * los que no necesitas los bloques estructurados y solo quieres mostrar
 * texto limpio (p. ej. en un <textarea> de edición). Para renderizado
 * enriquecido usa siempre `parseTextBlocks`.
 */
export function smartFormatText(texto: string | null | undefined): string {
  return normalizeRawText(texto);
}