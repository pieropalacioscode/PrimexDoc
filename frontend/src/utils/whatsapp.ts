// frontend/src/utils/whatsapp.ts

export type EstadoAlerta = 'nuevo' | 'por_vencer' | 'vencido';

/**
 * NORMALIZACIÓN INTELIGENTE
 * Convierte cualquier entrada del usuario en un destino válido para WhatsApp.
 */
export function normalizarTelefonoWhatsApp(contacto: string): string | null {
  if (!contacto) return null;

  const limpio = contacto.trim();

  // 1. Si el usuario pegó un link completo, lo respetamos
  if (limpio.startsWith('http')) return limpio;

  // 2. Limpieza total: quitamos +, espacios, guiones y el @
  // Mantenemos solo los números
  let soloNumeros = limpio.replace(/\D/g, '');

  // 3. Caso: El usuario escribió 0051... (quitamos los ceros iniciales)
  if (soloNumeros.startsWith('00')) {
    soloNumeros = soloNumeros.substring(2);
  }

  // 4. LÓGICA SMART PERÚ (99% de los casos)
  // Si tiene 9 dígitos exactos, es un celular peruano sin código de país
  if (soloNumeros.length === 9) {
    return `51${soloNumeros}`;
  }

  // 5. VALIDACIÓN MÍNIMA
  // Un número internacional real tiene entre 10 y 15 dígitos (con código de país)
  // Si tiene menos de 9, es un número incompleto/inválido
  if (soloNumeros.length < 9) return null;

  return soloNumeros;
}

/**
 * ALIAS PARA COMPATIBILIDAD
 * Algunos componentes pueden llamar a 'normalizarContacto'
 */
export const normalizarContacto = normalizarTelefonoWhatsApp;

/**
 * GENERADOR DE LINKS SMART
 * Crea el link final wa.me con mensaje precargado
 */
export function getSmartWhatsAppLink(contacto: string | undefined | null, mensaje?: string): string {
  if (!contacto) return '#';

  const destino = normalizarTelefonoWhatsApp(contacto);

  // Si no se pudo normalizar (número muy corto o basura), retornamos '#'
  if (!destino) return '#';

  const encodedText = mensaje ? `?text=${encodeURIComponent(mensaje)}` : '';

  // Si es un link completo (ej. Telegram o link directo guardado)
  if (destino.startsWith('http')) {
    // Si es un link de wa.me o api.whatsapp, le adjuntamos el texto si no lo tiene
    if (destino.includes('wa.me') || destino.includes('whatsapp.com')) {
      const separador = destino.includes('?') ? '&' : '?';
      return mensaje ? `${destino}${separador}text=${encodeURIComponent(mensaje)}` : destino;
    }
    return destino;
  }

  // Caso estándar: Número limpio -> wa.me
  return `https://wa.me/${destino}${encodedText}`;
}

/**
 * TEMPLATES DE MENSAJES PERSUASIVOS
 */
export function getMensajeWhatsAppPorEstado(
  nombre: string,
  estado: EstadoAlerta,
  dias?: number | null
): string {
  // Extraemos primer nombre y capitalizamos
  const rawName = nombre?.split(' ')[0] || 'Docente';
  const nombreDocente = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

  switch (estado) {
    case 'nuevo':
      return `¡Hola ${nombreDocente}! 👋 Bienvenido a Docente Smart. Vi que te registraste para preparar tu evaluación. ¿Te gustaría activar tu plan premium ahora para acceder a todos los simulacros?`;

    case 'por_vencer':
      const diasTexto = dias && dias > 0 ? `en ${dias} día(s)` : 'pronto';
      return `¡Hola ${nombreDocente}! 🔔 Te escribo de Docente Smart para recordarte que tu suscripción vence ${diasTexto}. ¿Deseas renovarla hoy para no perder tu acceso a los entrenamientos?`;

    case 'vencido':
      return `¡Hola ${nombreDocente}! ⚠️ Notamos que tu plan premium en Docente Smart ha vencido. ¿Te gustaría reactivarlo para continuar con tu preparación para el examen?`;

    default:
      return `Hola ${nombreDocente}, te saluda el equipo de Docente Smart. ¿En qué podemos ayudarte hoy?`;
  }
}