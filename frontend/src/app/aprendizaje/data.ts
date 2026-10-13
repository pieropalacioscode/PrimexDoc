// frontend > src > app > (dashboard) > aprendizaje > data.ts
// ============================================================
// DATA: Centro de Aprendizaje — Ascenso vs Nombramiento
// Todo lo que es dato puro (exámenes, esquemas de puntaje) vive
// aquí, separado del componente que lo renderiza.
// ============================================================

import type { ElementType } from "react";
import { TrendingUp, UserPlus } from "lucide-react";

// ============================================================
// TIPOS
// ============================================================

export interface ExamLink {
  cuadernillo: string;
  claves: string;
  simulacroID?: string;
}

export interface ExamYear {
  anio: number;
  nota?: string;
  primariaF1: ExamLink;
  primariaF2: ExamLink;
  edFisica?: ExamLink;
  edFisicaLabel?: string;
  innovacionPedagogica?: ExamLink;
  innovacionLabel?: string;
}

export type TipoExamen = "ascenso" | "nombramiento";

export interface SubpruebaPuntaje {
  nombre: string;
  preguntas: number;
  puntosPorPregunta: number;
  puntajeMaximo: number;
  minimo?: number;
}

export interface EsquemaPuntaje {
  subpruebas: SubpruebaPuntaje[];
  puntajeMaximoTotal: number;
  minimoTotal?: number;
  urlOficial: string;
}

// ============================================================
// QUIÉN ES QUIÉN ENTRE LOS DOS CONCURSOS
// ============================================================

export const TIPOS_INFO: Record<
  TipoExamen,
  {
    label: string;
    descripcion: string;
    fechaInfo: string;
    icono: ElementType;
  }
> = {
  ascenso: {
    label: "Ascenso",
    descripcion:
      "Ya estás nombrado y quieres subir de escala magisterial: mejor sueldo, mismo puesto.",
    fechaInfo: "Prueba Nacional 2026: domingo 25 de octubre del 2026",
    icono: TrendingUp,
  },

  nombramiento: {
    label: "Nombramiento",
    descripcion:
      "Eres docente contratado o interino y buscas ingresar de forma estable a la Carrera Pública Magisterial (CPM).",
    fechaInfo:
      "Convocatoria prevista para noviembre 2026 — aún sin norma técnica ni cuadernillos (sujeto a cambios)",
    icono: UserPlus,
  },
};



// ============================================================
// CÓMO SE REPARTE EL PUNTAJE EN CADA CONCURSO (verificado MINEDU)
// ============================================================

export const PUNTAJE_POR_TIPO: Record<TipoExamen, EsquemaPuntaje> = {
  ascenso: {
    subpruebas: [
      {
        nombre: "Prueba Nacional (Conocimiento Pedagógico y Disciplinar)",
        preguntas: 60,
        puntosPorPregunta: 1.5,
        puntajeMaximo: 90,
      },
    ],
    puntajeMaximoTotal: 90,
    urlOficial: "https://evaluaciondocente.perueduca.pe/ascenso26/prueba-nacional/",
  },
  nombramiento: {
    subpruebas: [
      {
        nombre: "Habilidades Generales",
        preguntas: 25,
        puntosPorPregunta: 2,
        puntajeMaximo: 50,
      },
      {
        nombre: "Conocimientos Pedagógicos, Curriculares y Disciplinares",
        preguntas: 50,
        puntosPorPregunta: 3,
        puntajeMaximo: 150,
        minimo: 84,
      },
    ],
    puntajeMaximoTotal: 200,
    minimoTotal: 110,
    urlOficial: "https://evaluaciondocente.perueduca.pe/nombramiento24/prueba-nacional/",
  },
};

// ============================================================
// EXÁMENES ASCENSO PRIMARIA (verificados en evaluaciondocente.perueduca.pe)
// ============================================================

export const EXAMENES_ASCENSO: ExamYear[] = [
  {
    anio: 2025,
    primariaF1: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11764967224A04-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11764967224A04-EBRP-11_C.pdf",
    },
    primariaF2: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11764967225A05-EBRP-12.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11764967226A05-EBRP-12_C.pdf",
    },
    edFisica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11764967273A64-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11764967273A64-EBRP-11_C.pdf",
    },
    innovacionPedagogica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11764967247A34-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11764967248A34-EBRP-11_C.pdf",
    },
  },
  {
    anio: 2024,
    primariaF1: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11733427249A04_BRP_11-_Primaria.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11733431330A04_EBR-Primaria_11_clv.pdf",
    },
    primariaF2: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11733427250A05_EBRP_12-_Primaria.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11733431330A05_EBR-Primaria_12_clv.pdf",
    },
    edFisica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11733427265A61_EBRP_11_Primaria-Educacion-Fisica.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11733431353A61-EBRP-11_EBR-Primaria-Educación-Física_clv.pdf",
    },
    innovacionPedagogica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11733427257A34_EBRP_11_Primaria-Profesor-de-Innovación-Pedagogica.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11733431341A34-EBRP-11_EBR-Primaria-Profesor-de-Innovación-Pedagógica_clv.pdf",
    },
  },
  {
    anio: 2023,
    primariaF1: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11702489394A04-EBRP-11_f1.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11702498874A04-EBRP-11_C.pdf",
    },
    primariaF2: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11702489395A05-EBRP-12_f2.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11702498875A05-EBRP-12_C.pdf",
    },
    edFisica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11702489396A07-EBRP-11_f1.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11702498876A07-EBRP-11_C.pdf",
    },
    innovacionPedagogica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11702489397A10-EBRP-11_f1.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11702498877A10-EBRP-11_C.pdf",
    },
  },
  {
    anio: 2022,
    nota: "Formato distinto: códigos A01/A02 en vez de A04/A05",
    primariaF1: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_cuadernillos/C_A01-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_claves/A01-EBRP-11.pdf",
    },
    primariaF2: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_cuadernillos/C_A02-EBRP-12.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_claves/A02-EBRP-12.pdf",
    },
    edFisica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_cuadernillos/C_A36-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_claves/A36-EBRP-11.pdf",
    },
    innovacionPedagogica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_cuadernillos/C_A04-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_claves/A04-EBRP-11.pdf",
    },
  },
];

// ============================================================
// EXÁMENES NOMBRAMIENTO PRIMARIA (verificados por año en cada
// portal oficial: nombramiento2018 / nombramiento2019 / nombramiento2022 / nombramiento24)
// ============================================================

export const EXAMENES_NOMBRAMIENTO: ExamYear[] = [
  {
    anio: 2024,
    nota: "Innovación Pedagógica y Educación Física se combinaron con Secundaria este año",
    primariaF1: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento24/nombramientoinstrumentos2024/pdfs_cuadernillos/C01-EBRP-21.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento24/nombramientoinstrumentos2024/pdfs_claves/C01EBRP21CLAVES.pdf",
    },
    primariaF2: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento24/nombramientoinstrumentos2024/pdfs_cuadernillos/C02-EBRP-22.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento24/nombramientoinstrumentos2024/pdfs_claves/C02EBRP22CLAVES.pdf",
    },
    innovacionPedagogica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento24/nombramientoinstrumentos2024/pdfs_cuadernillos/C16-EBR-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento24/nombramientoinstrumentos2024/pdfs_claves/C16EBR11CLAVES.pdf",
    },
    innovacionLabel: "Innovación Pedagógica (combinado con Secundaria)",
    edFisica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento24/nombramientoinstrumentos2024/pdfs_cuadernillos/C63-EB-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento24/nombramientoinstrumentos2024/pdfs_claves/C63EB11CLAVES.pdf",
    },
    edFisicaLabel: "Educación Física (combinado con Secundaria/EBA)",
  },
  {
    anio: 2022,
    nota: "Aplicado en dos fechas (09 y 11 dic); Educación Física salió en el segundo día con otro código",
    primariaF1: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento2022/nombramientoinstrumentos/pdfs_cuadernillos/Dia1/C01_EBRP_11_PRIMARIA_F1.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento2022/nombramientoinstrumentos/pdfs_claves/C01_EBRP_11_PRIMARIA.pdf",
    },
    primariaF2: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento2022/nombramientoinstrumentos/pdfs_cuadernillos/Dia1/C02_EBRP_12_PRIMARIA_F2.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento2022/nombramientoinstrumentos/pdfs_claves/C02_EBRP_12_PRIMARIA.pdf",
    },
    innovacionPedagogica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento2022/nombramientoinstrumentos/pdfs_cuadernillos/Dia1/C04_EBRP_11_PRIMARIA_INNOVACION_F1.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento2022/nombramientoinstrumentos/pdfs_claves/C04_EBRP_11_PRIMARIA_INNOVACION.pdf",
    },
    edFisica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento2022/nombramientoinstrumentos/pdfs_cuadernillos/Dia2/C36_EBRP_21_PRIMARIA_EDU_FISICA_F1.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento2022/nombramientoinstrumentos/pdfs_claves/C36_EBRP_21_PRIMARIA_EDU_FISICA.pdf",
    },
    edFisicaLabel: "Educación Física (Día 2 · código distinto)",
  },
  {
    anio: 2019,
    nota: "Un solo código (C04-EBRP-11) cubría Primaria general, Ed. Física e Innovación — solo cambiaba el PDF",
    primariaF1: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento2019/nombramientoinstrumentos/pdfs_cuadernillos/C04-EBRP-11_EBR%20PRIMARIA_FORMA%201.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento2019/nombramientoinstrumentos/pdfs_claves/C04-EBRP-11_EBR%20PRIMARIA_FORMA%201.pdf",
    },
    primariaF2: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento2019/nombramientoinstrumentos/pdfs_cuadernillos/C05-EBRP-12_EBR%20PRIMARIA_FORMA%202.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento2019/nombramientoinstrumentos/pdfs_claves/C05-EBRP-12_EBR%20PRIMARIA_FORMA%202.pdf",
    },
    innovacionPedagogica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento2019/nombramientoinstrumentos/pdfs_cuadernillos/C04-EBRP-11_EBR%20PRIMARIA%20AULA%20DE%20INNOVACION%20PEDAGOGICA_FORMA%201.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento2019/nombramientoinstrumentos/pdfs_claves/C04-EBRP-11_EBR%20PRIMARIA%20AULA%20DE%20INNOVACION%20PEDAGOGICA_FORMA%201.pdf",
    },
    edFisica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/nombramiento2019/nombramientoinstrumentos/pdfs_cuadernillos/C04-EBRP-11_EBR%20PRIMARIA%20EDUCACION%20FISICA_FORMA%201.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/nombramiento2019/nombramientoinstrumentos/pdfs_claves/C04-EBRP-11_EBR%20PRIMARIA%20EDUCACION%20FISICA_FORMA%201.pdf",
    },
  },
  {
      anio: 2018,
      nota: "¡ACCESO GRATUITO! Prueba nuestro simulador virtual con estos exámenes oficiales (C04 y C05)",
      primariaF1: {
        cuadernillo:
          "https://evaluaciondocente.perueduca.pe/nombramiento2018/nombramientoinstrumentos/pdfs/C04-EBRP-11%20EBR%20Nivel%20Primaria.pdf",
        claves:
          "https://evaluaciondocente.perueduca.pe/nombramiento2018/nombramientoinstrumentos/pdf_claves/C04-EBRP-11-EBR%20Primaria.pdf",
        // ID asignado en Backend para C04-2018 (Simulacro Gratis)
        simulacroID: "faf6dadc-e9b8-41c5-8cb3-2d88e204336b",
      },
      primariaF2: {
        cuadernillo:
          "https://evaluaciondocente.perueduca.pe/nombramiento2018/nombramientoinstrumentos/pdfs/C05-EBRP-12%20EBR%20Nivel%20Primaria.pdf",
        claves:
          "https://evaluaciondocente.perueduca.pe/nombramiento2018/nombramientoinstrumentos/pdf_claves/C05-EBRP-12-EBR%20Primaria.pdf",
        // ID asignado en Backend para C05-2018 (Simulacro Gratis)
        simulacroID: "a7aac235-c5a1-498a-b69e-0e01b2edd487",
      },
      edFisica: {
        cuadernillo:
          "https://evaluaciondocente.perueduca.pe/nombramiento2018/nombramientoinstrumentos/pdfs/C04-EBRP-11%20EBR%20Primaria%20Educaci%C3%B3n%20F%C3%ADsica.pdf",
        claves:
          "https://evaluaciondocente.perueduca.pe/nombramiento2018/nombramientoinstrumentos/pdf_claves/C04-EBRP-11-EBR%20Educaci%C3%B3n%20F%C3%ADsica.pdf",
        // También puedes habilitar el simulador para Ed. Física usando el mismo ID del C04
        // simulacroID: "faf6dadc-e9b8-41c5-8cb3-2d88e204336b",
      },
    },

];
export function buscarExamenPorAnio(tipo: TipoExamen, anio: string) {
  const lista = tipo === 'ascenso' ? EXAMENES_ASCENSO : EXAMENES_NOMBRAMIENTO;
  return lista.find(ex => ex.anio.toString() === anio);
}