package auth

import (
	"fmt"
	"net/smtp"
	"os"
)

func EnviarCodigoEmail(destinatario string, codigo string) error {
	from := os.Getenv("SMTP_USER")
	password := os.Getenv("SMTP_PASSWORD")
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")

	// Configuración del mensaje
	subject := "Subject: Código de Recuperación - PrimexDoc\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf(`
		<div style="font-family: sans-serif; max-width: 400px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
			<h2 style="color: #2563eb;">PrimexDoc</h2>
			<p>Hola, docente. Has solicitado recuperar tu contraseña.</p>
			<p>Tu código de seguridad es:</p>
			<div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e40af; border-radius: 8px;">
				%s
			</div>
			<p style="font-size: 12px; color: #6b7280; mt: 20px;">Este código expirará en 15 minutos. Si no solicitaste esto, ignora este correo.</p>
		</div>
	`, codigo)

	msg := []byte(subject + mime + body)
	auth := smtp.PlainAuth("", from, password, host)

	err := smtp.SendMail(host+":"+port, auth, from, []string{destinatario}, msg)
	if err != nil {
		return err
	}
	return nil
}
