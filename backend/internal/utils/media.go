package utils

import (
	"os"
	"strings"
)

// FormatearURLImagen construye la URL completa para una imagen/recurso
func FormatearURLImagen(rutaRelativa string) string {
	if rutaRelativa == "" {
		return ""
	}

	// Si la ruta ya es una URL completa, la devolvemos tal cual
	if strings.HasPrefix(rutaRelativa, "http://") || strings.HasPrefix(rutaRelativa, "https://") {
		return rutaRelativa
	}

	baseURL := os.Getenv("MEDIA_BASE_URL")
	// Limpiar posibles barras duplicadas
	rutaRelativa = strings.TrimPrefix(rutaRelativa, "/")

	return baseURL + "/" + rutaRelativa
}
