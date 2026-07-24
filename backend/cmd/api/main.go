package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/alienwarecode/docent-primex-api/internal/handler"
	"github.com/alienwarecode/docent-primex-api/internal/router"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		if err := godotenv.Load("../.env"); err != nil {
			log.Println("Aviso: No se encontró archivo .env local ni en la raíz.")
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("ERROR: DATABASE_URL no está configurada")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	poolConfig, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Error configurando el pool de Postgres: %v", err)
	}

	poolConfig.MaxConns = 25
	poolConfig.MinConns = 5

	dbPool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatalf("No se pudo conectar a la base de datos: %v", err)
	}
	defer dbPool.Close()

	if err := dbPool.Ping(ctx); err != nil {
		log.Fatalf("Fallo el Ping a la Base de Datos: %v", err)
	}

	fmt.Println("==================================================")
	fmt.Println("🚀 Conexión exitosa a PostgreSQL (primex_db)!")
	
	// Inicializar Handlers y Router
	queries := db.New(dbPool)
	h := handler.NewHandler(queries)
	appRouter := router.NewRouter(h)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      appRouter,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	fmt.Printf("🌐 Servidor API corriendo en http://localhost:%s\n", port)
	fmt.Println("==================================================")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Error crítico en el servidor HTTP: %v", err)
	}
}