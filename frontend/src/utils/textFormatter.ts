// frontend/src/utils/textFormatter.ts
//
// Parseo PURO de texto de examen (sin JSX, sin dependencias de React).
// Convierte un string crudo — tal como sale de PostgreSQL — en una lista
// de "bloques" (párrafos o listas), y cada bloque en una lista de
// "tokens" (texto normal o fracción). Al ser funciones puras, se pueden
// testear con Jest/Vitest de forma aislada, sin renderizar nada.
//
// Componentes que consumen esto: src/components/exam/QuestionText.tsx

export type TextToken =
  | { type: 'text'; value: string }
  | { type: 'fraction'; numerator: string; denominator: string };

export type TextBlock =
  | { type: 'paragraph'; tokens: TextToken[] }
  | { type: 'list'; items: TextToken[][] };

// "•", "●", "▪" son viñetas inequívocas (no hace falta espacio después).
// "-" solo cuenta como viñeta si va seguido de un espacio, para no
// confundir un guion con un número negativo como "-5" o "-1/2".
const BULLET_REGEX = /^(?:[•●▪]\s*|-\s+)(.*)$/;

/**
 * Detecta fracciones tipo "1/2", "20/3", "100/4" dentro de un texto.
 *
 *   (?<![\d/])        el caracter anterior NO puede ser dígito ni "/"
 *   (\d{1,3})\/(\d{1,3})   numerador / denominador (1 a 3 dígitos c/u)
 *   (?!\d*\/)          lo que sigue NO puede ser más dígitos y otra "/"
 *
 * Los dos guardas evitan que una fecha como "12/05/2024" se interprete
 * como fracción. Si necesitas fracciones de 4+ dígitos, cambia {1,3}
 * por {1,4} en ambos grupos (a costa de más falsos positivos con fechas).
 */
function createFractionRegex(): RegExp {
  return /(?<![\d/])(\d{1,3})\/(\d{1,3})(?!\d*\/)/g;
}

/**
 * Divide un texto plano (sin \n) en tokens de texto normal y fracción.
 */
export function tokenizeFractions(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  const regex = createFractionRegex();
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const full = match[0];
    const numerator = match[1] ?? '';
    const denominator = match[2] ?? '';

    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    tokens.push({ type: 'fraction', numerator, denominator });
    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', value: text }];
}

/**
 * Convierte un texto crudo (con \n, viñetas "•"/"-" y fracciones "1/2")
 * en bloques listos para renderizar: párrafos y listas.
 *
 * Cada línea no vacía se trata como su propia unidad semántica — NO se
 * fusionan líneas consecutivas en un solo párrafo largo — porque tu
 * contenido ya viene curado línea por línea desde el Excel/PDF oficial
 * (examenes_oficiales.xlsx). Las líneas vacías solo actúan como
 * separador visual (el margen entre bloques ya genera el espacio).
 *
 * Si algún texto fuente trae saltos de línea "accidentales" (p. ej. de
 * una extracción de PDF mal cortada), eso es un problema de limpieza de
 * datos en el Excel, no algo que este parser deba adivinar.
 */
export function parseTextBlocks(rawText: string | null | undefined): TextBlock[] {
  if (!rawText) return [];

  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const blocks: TextBlock[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const bulletMatch = line.match(BULLET_REGEX);

    if (bulletMatch) {
      const itemTokens = tokenizeFractions((bulletMatch[1] ?? '').trim());
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock?.type === 'list') {
        lastBlock.items.push(itemTokens);
      } else {
        blocks.push({ type: 'list', items: [itemTokens] });
      }
    } else {
      blocks.push({ type: 'paragraph', tokens: tokenizeFractions(line) });
    }
  }

  return blocks;
}
