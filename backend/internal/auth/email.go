package auth

import (
	"fmt"
	"os"
	"strings"

	"github.com/resend/resend-go/v2"
)

func EnviarCodigoEmail(destinatario string, codigo string) error {
	apiKey := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	if apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY no está configurada")
	}

	from := strings.TrimSpace(os.Getenv("EMAIL_FROM"))
	if from == "" {
		from = "DocenteSmart <soporte@docentesmart.com>"
	}

	destinatario = strings.TrimSpace(destinatario)
	if destinatario == "" {
		return fmt.Errorf("el destinatario no puede estar vacío")
	}

	codigo = strings.TrimSpace(codigo)
	if codigo == "" {
		return fmt.Errorf("el código no puede estar vacío")
	}

	client := resend.NewClient(apiKey)

	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="
	margin: 0;
	padding: 0;
	background-color: #f8fafc;
	font-family: Arial, Helvetica, sans-serif;
	color: #0f172a;
">
	<div style="
		max-width: 600px;
		margin: 0 auto;
		padding: 32px 16px;
	">
		<div style="
			background-color: #ffffff;
			border: 1px solid #e2e8f0;
			border-radius: 16px;
			padding: 32px 24px;
			text-align: center;
		">
			<h1 style="
				margin: 0 0 8px;
				font-size: 28px;
				color: #2563eb;
			">
				DocenteSmart
			</h1>

			<p style="
				margin: 0 0 28px;
				color: #64748b;
				font-size: 15px;
			">
				Recuperación de contraseña
			</p>

			<p style="
				font-size: 16px;
				line-height: 1.6;
				color: #334155;
			">
				Usa el siguiente código para restablecer tu contraseña:
			</p>

			<div style="
				margin: 28px 0;
				padding: 20px;
				background-color: #f8fafc;
				border: 1px solid #e2e8f0;
				border-radius: 12px;
				font-size: 32px;
				font-weight: 700;
				letter-spacing: 8px;
				color: #1d4ed8;
			">
				%s
			</div>

			<p style="
				font-size: 14px;
				line-height: 1.6;
				color: #64748b;
			">
				Este código expira en <strong>15 minutos</strong>.
			</p>

			<p style="
				margin-top: 28px;
				font-size: 12px;
				line-height: 1.6;
				color: #94a3b8;
			">
				Si no solicitaste el restablecimiento de tu contraseña,
				puedes ignorar este correo.
			</p>
		</div>

		<p style="
			text-align: center;
			margin-top: 20px;
			font-size: 12px;
			color: #94a3b8;
		">
			© DocenteSmart
		</p>
	</div>
</body>
</html>
`, codigo)

	params := &resend.SendEmailRequest{
		From:    from,
		To:      []string{destinatario},
		Subject: "Código de recuperación - DocenteSmart",
		Html:    htmlContent,
	}

	_, err := client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("error al enviar correo con Resend: %w", err)
	}

	return nil
}
