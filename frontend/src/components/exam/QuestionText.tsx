// frontend/src/components/exam/QuestionText.tsx
//
// Dos componentes de presentación para texto de examen, ambos sobre la
// lógica pura de src/utils/textFormatter.ts:
//
// - <QuestionText />  Texto "en bloque": párrafos <p> + listas <ul><li>.
//                      Úsalo para enunciados y textos base / casos
//                      pedagógicos, que pueden traer viñetas.
//
// - <InlineText />    Solo resuelve las fracciones, sin crear <p>/<ul>.
//                      Úsalo para textos de una sola línea (p. ej. las
//                      alternativas A/B/C/D), donde envolver en <div>
//                      podría romper un layout con flex/gap existente.
//
// No requieren 'use client': son funciones puras de render sin hooks ni
// APIs de navegador, así que quedan incluidas en el bundle del cliente
// igual, sin necesitar su propia directiva.

import { parseTextBlocks, tokenizeFractions, TextToken } from '@/utils/textFormatter';
import { Fraction } from './Fraction';

function renderTokens(tokens: TextToken[], keyPrefix: string) {
  return tokens.map((token, i) =>
    token.type === 'fraction' ? (
      <Fraction key={`${keyPrefix}-f${i}`} numerator={token.numerator} denominator={token.denominator} />
    ) : (
      // Los strings sueltos en un array de children de React NO
      // necesitan "key" (React solo exige key en elementos).
      token.value
    )
  );
}

interface InlineTextProps {
  text?: string | null;
}

export function InlineText({ text }: InlineTextProps) {
  if (!text) return null;
  return <>{renderTokens(tokenizeFractions(text), 'inline')}</>;
}

interface QuestionTextProps {
  text?: string | null;
  className?: string;
}

export function QuestionText({ text, className = '' }: QuestionTextProps) {
  const blocks = parseTextBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === 'list') {
          return (
            <ul key={i} className="my-3 space-y-1.5">
              {block.items.map((itemTokens, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 font-bold text-blue-600">•</span>
                  <span>{renderTokens(itemTokens, `${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="mb-2 last:mb-0">
            {renderTokens(block.tokens, `${i}`)}
          </p>
        );
      })}
    </div>
  );
}
