// backend > internal > auth > examenes_gratuitos.go
package auth

// ExamenesGratuitos: IDs de exámenes accesibles públicamente sin JWT,
// usados para indexación SEO en Google. Debe reflejar los mismos IDs
// que EXAMENES_GRATUITOS_IDS en el frontend.
var ExamenesGratuitos = map[string]bool{
	"a7aac235-c5a1-498a-b69e-0e01b2edd487": true,
	"faf6dadc-e9b8-41c5-8cb3-2d88e204336b": true,
	"<uuid-examen-2018-A>":                 true,
	"<uuid-examen-2018-B>":                 true,
}
