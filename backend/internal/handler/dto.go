package handler

import (
	"time"

	"github.com/google/uuid"
)

// ResponseDataWrapper envoltorio genérico {"data": ...} para cumplir el contrato OpenAPI
type ResponseDataWrapper struct {
	Data interface{} `json:"data"`
}

// ==========================================
// DTOs de Exámenes (Catálogo y Simulador)
// ==========================================

type ExamenResumenDTO struct {
	ID                uuid.UUID `json:"id"`
	Titulo            string    `json:"titulo"`
	CodigoCuadernillo string    `json:"codigo_cuadernillo"`
	Descripcion       string    `json:"descripcion,omitempty"`
	Nivel             string    `json:"nivel"`
	Tipo              string    `json:"tipo"`
	Anio              int32     `json:"anio"`
	TotalPreguntas    int32     `json:"total_preguntas"`
	DuracionMinutos   int32     `json:"duracion_minutos"`
}

type TextoBaseDTO struct {
	ID              uuid.UUID `json:"id"`
	CodigoTextoBase string    `json:"codigo_texto_base"`
	Titulo          string    `json:"titulo,omitempty"`
	Contenido       string    `json:"contenido"`
}

type OpcionDTO struct {
	ID          uuid.UUID `json:"id"`
	PreguntaID  uuid.UUID `json:"pregunta_id,omitempty"`
	Etiqueta    string    `json:"etiqueta"`
	TextoOpcion string    `json:"texto_opcion"`
}

type PreguntaDTO struct {
	ID             uuid.UUID   `json:"id"`
	NumeroPregunta int32       `json:"numero_pregunta"`
	TextoPregunta  string      `json:"texto_pregunta"`
	TextoBaseID    *uuid.UUID  `json:"texto_base_id,omitempty"`
	UrlImagen      string      `json:"url_imagen,omitempty"`
	Opciones       []OpcionDTO `json:"opciones"`
}

type ExamenDetalleDTO struct {
	ID                uuid.UUID      `json:"id"`
	Titulo            string         `json:"titulo"`
	CodigoCuadernillo string         `json:"codigo_cuadernillo"`
	Descripcion       string         `json:"descripcion,omitempty"`
	Nivel             string         `json:"nivel"`
	Tipo              string         `json:"tipo"`
	Anio              int32          `json:"anio"`
	TotalPreguntas    int32          `json:"total_preguntas"`
	DuracionMinutos   int32          `json:"duracion_minutos"`
	TextosBase        []TextoBaseDTO `json:"textos_base"`
	Preguntas         []PreguntaDTO  `json:"preguntas"`
}

// ==========================================
// DTOs de Intentos (Fase 3 - Evaluaciones)
// ==========================================

type IniciarIntentoRequestDTO struct {
	ExamenID uuid.UUID `json:"examen_id"`
	Modo     string    `json:"modo"` // "simulacro" o "practica"
}

type RespuestaDocenteDTO struct {
	PreguntaID           uuid.UUID  `json:"pregunta_id"`
	OpcionSeleccionadaID *uuid.UUID `json:"opcion_seleccionada_id"` // nil si no la respondió
}

type FinalizarIntentoRequestDTO struct {
	Respuestas             []RespuestaDocenteDTO `json:"respuestas"`
	TiempoEmpleadoSegundos int                   `json:"tiempo_empleado_segundos"` // 👈 Agrega esta línea
}

type IntentoResumenDTO struct {
	ID                     uuid.UUID  `json:"id"`
	ExamenID               uuid.UUID  `json:"examen_id"`
	ExamenTitulo           string     `json:"examen_titulo,omitempty"`
	Nivel                  string     `json:"nivel,omitempty"`
	Tipo                   string     `json:"tipo,omitempty"`
	Anio                   int32      `json:"anio,omitempty"`
	Modo                   string     `json:"modo"`
	Puntaje                float64    `json:"puntaje"`
	TotalPreguntas         int32      `json:"total_preguntas"`
	PreguntasCorrectas     int32      `json:"preguntas_correctas"`
	PreguntasIncorrectas   int32      `json:"preguntas_incorrectas"`
	TiempoEmpleadoSegundos int32      `json:"tiempo_empleado_segundos"`
	Estado                 string     `json:"estado"`
	IniciadoEn             time.Time  `json:"iniciado_en"`
	FinalizadoEn           *time.Time `json:"finalizado_en,omitempty"`
}

type DetalleRespuestaRetroalimentacionDTO struct {
	PreguntaID           uuid.UUID  `json:"pregunta_id"`
	NumeroPregunta       int32      `json:"numero_pregunta"`
	OpcionSeleccionadaID *uuid.UUID `json:"opcion_seleccionada_id"`
	OpcionCorrectaID     uuid.UUID  `json:"opcion_correcta_id"`
	EsCorrecta           bool       `json:"es_correcta"`
	Explicacion          string     `json:"explicacion,omitempty"`
}

type ReporteIntentoDetalleDTO struct {
	Intento  IntentoResumenDTO                      `json:"intento"`
	Detalles []DetalleRespuestaRetroalimentacionDTO `json:"detalles"`
}
