package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/xuri/excelize/v2"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("❌ Uso: go run cmd/importer/main.go <ruta_al_excel.xlsx>")
	}

	excelPath := os.Args[1]
	fmt.Printf("📂 Abriendo archivo Excel: %s\n", excelPath)

	f, err := excelize.OpenFile(excelPath)
	if err != nil {
		log.Fatalf("❌ Error al abrir el archivo Excel: %v", err)
	}
	defer f.Close()

	// 1. Conexión a la base de datos
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://docentesmart:smart2026@127.0.0.1:5432/primex?sslmode=disable"
	}

	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("❌ Error conectando a PostgreSQL: %v", err)
	}
	defer db.Close()

	// 🛠️ AUTOMIGRACIÓN: Crear la tabla textos_base y columna texto_base_id si no existen
	ddlAutoMigrate := `
		CREATE TABLE IF NOT EXISTS textos_base (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			examen_id UUID NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
			codigo_texto_base VARCHAR(50) NOT NULL,
			titulo VARCHAR(255),
			contenido TEXT NOT NULL,
			creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT unique_codigo_texto_base_por_examen UNIQUE (examen_id, codigo_texto_base)
		);

		CREATE INDEX IF NOT EXISTS idx_textos_base_examen ON textos_base(examen_id);

		ALTER TABLE preguntas 
		ADD COLUMN IF NOT EXISTS texto_base_id UUID REFERENCES textos_base(id) ON DELETE SET NULL;

		CREATE INDEX IF NOT EXISTS idx_preguntas_texto_base ON preguntas(texto_base_id);
	`
	_, err = db.Exec(ddlAutoMigrate)
	if err != nil {
		log.Fatalf("❌ Error preparando las tablas en la base de datos: %v", err)
	}

	// Iniciar Transacción
	tx, err := db.Begin()
	if err != nil {
		log.Fatalf("❌ Error iniciando transacción: %v", err)
	}
	defer tx.Rollback()

	// ----------------------------------------------------
	// HOJA 1: "examenes"
	// ----------------------------------------------------
	rowsExamenes, err := f.GetRows("examenes")
	if err != nil || len(rowsExamenes) < 2 {
		log.Fatalf("❌ Error leyendo la hoja 'examenes' o está vacía")
	}

	headerExamen := rowsExamenes[0]
	dataExamen := rowsExamenes[1]

	colExamen := make(map[string]string)
	for i, h := range headerExamen {
		if i < len(dataExamen) {
			colExamen[strings.TrimSpace(h)] = strings.TrimSpace(dataExamen[i])
		}
	}

	codigoCuadernillo := colExamen["codigo_cuadernillo"]
	tituloExamen := colExamen["titulo"]
	descripcionExamen := colExamen["descripcion"]
	nivelExamen := strings.ToLower(colExamen["nivel"])
	tipoExamen := strings.ToLower(colExamen["tipo"])
	anioExamen, _ := strconv.Atoi(colExamen["anio"])
	duracionMinutos, _ := strconv.Atoi(colExamen["duracion_minutos"])

	rowsPreguntas, err := f.GetRows("preguntas")
	if err != nil {
		log.Fatalf("❌ Error leyendo la hoja 'preguntas'")
	}
	totalPreguntas := len(rowsPreguntas) - 1

	var examenID string
	queryExamen := `
		INSERT INTO examenes (
			titulo, codigo_cuadernillo, descripcion, nivel, tipo, anio, total_preguntas, duracion_minutos
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (codigo_cuadernillo) DO UPDATE SET
			titulo = EXCLUDED.titulo,
			descripcion = EXCLUDED.descripcion,
			nivel = EXCLUDED.nivel,
			tipo = EXCLUDED.tipo,
			anio = EXCLUDED.anio,
			total_preguntas = EXCLUDED.total_preguntas,
			duracion_minutos = EXCLUDED.duracion_minutos
		RETURNING id;
	`
	err = tx.QueryRow(queryExamen, tituloExamen, codigoCuadernillo, descripcionExamen, nivelExamen, tipoExamen, anioExamen, totalPreguntas, duracionMinutos).Scan(&examenID)
	if err != nil {
		log.Fatalf("❌ Error guardando el examen: %v", err)
	}
	fmt.Printf("✅ Examen '%s' guardado con ID: %s\n", codigoCuadernillo, examenID)

	// ----------------------------------------------------
	// HOJA 2: "textos_base"
	// ----------------------------------------------------
	rowsTextos, err := f.GetRows("textos_base")
	mapaTextos := make(map[string]string)

	if err == nil && len(rowsTextos) > 1 {
		headerTextos := rowsTextos[0]
		mapHeaderT := make(map[string]int)
		for i, h := range headerTextos {
			mapHeaderT[strings.TrimSpace(h)] = i
		}

		for r := 1; r < len(rowsTextos); r++ {
			row := rowsTextos[r]
			if len(row) == 0 {
				continue
			}

			codTexto := getVal(row, mapHeaderT, "codigo_texto_base")
			if codTexto == "" {
				continue
			}
			titTexto := getVal(row, mapHeaderT, "titulo")
			contenido := getVal(row, mapHeaderT, "contenido")

			var textoID string
			queryTexto := `
				INSERT INTO textos_base (examen_id, codigo_texto_base, titulo, contenido)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (examen_id, codigo_texto_base) DO UPDATE SET
					titulo = EXCLUDED.titulo,
					contenido = EXCLUDED.contenido
				RETURNING id;
			`
			err = tx.QueryRow(queryTexto, examenID, codTexto, titTexto, contenido).Scan(&textoID)
			if err != nil {
				log.Fatalf("❌ Error guardando texto_base '%s': %v", codTexto, err)
			}
			mapaTextos[codTexto] = textoID
		}
	}
	fmt.Printf("✅ %d textos base procesados.\n", len(mapaTextos))

	// ----------------------------------------------------
	// HOJA 3: "preguntas" y "opciones"
	// ----------------------------------------------------
	headerPreguntas := rowsPreguntas[0]
	mapHeaderP := make(map[string]int)
	for i, h := range headerPreguntas {
		mapHeaderP[strings.TrimSpace(h)] = i
	}

	preguntasCount := 0
	opcionesCount := 0

	for r := 1; r < len(rowsPreguntas); r++ {
		row := rowsPreguntas[r]
		if len(row) == 0 {
			continue
		}

		numPregunta, _ := strconv.Atoi(getVal(row, mapHeaderP, "numero_pregunta"))
		codTextoRef := getVal(row, mapHeaderP, "codigo_texto_base")
		textoPregunta := getVal(row, mapHeaderP, "texto_pregunta")
		urlImagen := getVal(row, mapHeaderP, "url_imagen")
		explicacion := getVal(row, mapHeaderP, "explicacion")
		claveCorrecta := strings.ToUpper(getVal(row, mapHeaderP, "clave_correcta"))

		var textoBaseID sql.NullString
		if codTextoRef != "" {
			idFound, ok := mapaTextos[codTextoRef]
			if !ok {
				log.Fatalf("❌ Error de Integridad: La pregunta %d usa el texto '%s' pero no existe en la hoja 'textos_base'", numPregunta, codTextoRef)
			}
			textoBaseID = sql.NullString{String: idFound, Valid: true}
		}

		var preguntaID string
		queryPregunta := `
			INSERT INTO preguntas (examen_id, numero_pregunta, texto_base_id, texto_pregunta, url_imagen, explicacion)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (examen_id, numero_pregunta) DO UPDATE SET
				texto_base_id = EXCLUDED.texto_base_id,
				texto_pregunta = EXCLUDED.texto_pregunta,
				url_imagen = EXCLUDED.url_imagen,
				explicacion = EXCLUDED.explicacion
			RETURNING id;
		`
		err = tx.QueryRow(queryPregunta, examenID, numPregunta, textoBaseID, textoPregunta, urlImagen, explicacion).Scan(&preguntaID)
		if err != nil {
			log.Fatalf("❌ Error guardando la pregunta %d: %v", numPregunta, err)
		}
		preguntasCount++

		opciones := map[string]string{
			"A": getVal(row, mapHeaderP, "opcion_a"),
			"B": getVal(row, mapHeaderP, "opcion_b"),
			"C": getVal(row, mapHeaderP, "opcion_c"),
			"D": getVal(row, mapHeaderP, "opcion_d"),
		}

		for etiqueta, textoOpcion := range opciones {
			if textoOpcion == "" {
				continue
			}
			esCorrecta := (etiqueta == claveCorrecta)

			queryOpcion := `
				INSERT INTO opciones (pregunta_id, etiqueta, texto_opcion, es_correcta)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (pregunta_id, etiqueta) DO UPDATE SET
					texto_opcion = EXCLUDED.texto_opcion,
					es_correcta = EXCLUDED.es_correcta;
			`
			_, err = tx.Exec(queryOpcion, preguntaID, etiqueta, textoOpcion, esCorrecta)
			if err != nil {
				log.Fatalf("❌ Error guardando opción %s de pregunta %d: %v", etiqueta, numPregunta, err)
			}
			opcionesCount++
		}
	}

	if err := tx.Commit(); err != nil {
		log.Fatalf("❌ Error finalizando transacción (Commit): %v", err)
	}

	fmt.Println("\n🚀 ¡IMPORTACIÓN EN GO COMPLETADA CON ÉXITO!")
	fmt.Printf("   • Preguntas cargadas/actualizadas: %d\n", preguntasCount)
	fmt.Printf("   • Opciones insertadas: %d\n", opcionesCount)
}

func getVal(row []string, mapHeader map[string]int, key string) string {
	idx, ok := mapHeader[key]
	if !ok || idx >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[idx])
}
