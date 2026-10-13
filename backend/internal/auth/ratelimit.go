// backend > internal > auth > ratelimit.go
package auth

import (
	"net/http"
	"sync"

	"golang.org/x/time/rate"
)

var visitors = make(map[string]*rate.Limiter)
var mu sync.Mutex

func getLimiter(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	limiter, exists := visitors[ip]
	if !exists {
		// 🚀 INTELIGENCIA:
		// Antes: 3 req / 60 seg (Muy lento para un Dashboard)
		// Ahora: 30 req / 60 seg (0.5 req/seg) con un burst de 10.
		// Esto permite que el Promise.all de 4 peticiones pase sin problemas.
		limiter = rate.NewLimiter(rate.Limit(30.0/60.0), 10)
		visitors[ip] = limiter
	}
	return limiter
}

func RateLimitAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if !getLimiter(ip).Allow() {
			http.Error(w, "Demasiadas peticiones. Intenta más tarde.", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
