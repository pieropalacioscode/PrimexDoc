//src/components/PreguntaCard.tsx
import { Pregunta, Opcion } from '../types/index'; // Asegúrate de exportar Opcion también

interface Props {
  pregunta: Pregunta;
  respuestaSeleccionada?: string;
  onSeleccionarOpcion: (preguntaId: string, etiqueta: string) => void;
}

export const PreguntaCard = ({
  pregunta,
  respuestaSeleccionada,
  onSeleccionarOpcion,
}: Props) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
      {/* ... (resto del código anterior) ... */}

      <div className="grid gap-3">
        {/* Agregamos el tipo Opcion aquí para quitar el error de 'any' */}
        {pregunta.opciones?.map((opcion: Opcion) => {
          const isSelected = respuestaSeleccionada === opcion.etiqueta;
          return (
            <button
              key={opcion.id}
              onClick={() => onSeleccionarOpcion(pregunta.id, opcion.etiqueta)}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all ${
                isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-100'
              }`}
            >
              {/* Contenido del botón */}
              <span className="font-bold">{opcion.etiqueta}</span>
              <span>{opcion.texto_opcion}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};