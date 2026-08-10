// frontend/src/components/exam/Fraction.tsx
//
// Fracción visual apilada: numerador, barra horizontal, denominador —
// como en un examen impreso oficial. Usamos flexbox + border-bottom en
// vez de <sup>/<sub> con "/" porque eso da una notación DIAGONAL
// (estilo "1⁄2"), mientras que una fracción de examen de matemática se
// presenta con barra HORIZONTAL. Si prefieres la versión sup/sub (más
// liviana, sin barra), dímelo y te la paso.
//
// - "select-none" + aria-hidden en los números visibles: evita que una
//   selección de texto que cruce la fracción se vea rota en dos líneas
//   apiladas que no son adyacentes en el DOM lineal.
// - role="img" + aria-label: un lector de pantalla anuncia "3 sobre 4"
//   en vez de leer "3" y "4" como si fueran texto suelto.
// - Tamaño y color en "em"/"currentColor": la fracción hereda el
//   tamaño y el color del texto donde se use (enunciado grande,
//   alternativa pequeña, texto base, etc.) sin que tengas que pasar
//   props extra por cada contexto.

interface FractionProps {
  numerator: string;
  denominator: string;
}

export function Fraction({ numerator, denominator }: FractionProps) {
  return (
    <span
      role="img"
      aria-label={`${numerator} sobre ${denominator}`}
      className="inline-flex -translate-y-[2px] mx-0.5 flex-col items-stretch align-middle text-[0.78em] font-semibold leading-[1.15] select-none"
    >
      <span aria-hidden="true" className="border-b border-current px-0.5 text-center">
        {numerator}
      </span>
      <span aria-hidden="true" className="px-0.5 text-center">
        {denominator}
      </span>
    </span>
  );
}
