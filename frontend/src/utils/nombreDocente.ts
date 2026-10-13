/**
 * Resuelve el nombre a mostrar de un usuario/docente de forma robusta.
 *
 * El objeto `user` puede venir de distintas fuentes (AuthContext, /me,
 * cache local, token decodificado, etc.) y no siempre trae el mismo shape,
 * así que probamos varias rutas posibles antes de caer a un fallback.
 * Compartido entre Sidebar.tsx y la página de Perfil para que ambos
 * muestren siempre el mismo nombre, con la misma lógica.
 */
export function resolverNombreDocente(user: any): { label: string; isLoading: boolean } {
  // Caso 1: la fuente de datos aún no resolvió (undefined = no inicializado).
  if (user === undefined) {
    return { label: 'Cargando...', isLoading: true };
  }

  // Caso 2: ya resolvió pero no hay usuario (no debería pasar en rutas
  // protegidas, pero evitamos romper el render).
  if (user === null) {
    return { label: 'Docente', isLoading: false };
  }

  // Posibles campos donde puede venir el nombre, en orden de preferencia.
  const candidatos = [
    user.nombre_completo,
    user.nombreCompleto,
    user.nombre,
    user.name,
    user.displayName,
    user.full_name,
    user.fullName,
    [user.nombres, user.apellidos].filter(Boolean).join(' '),
    [user.first_name, user.last_name].filter(Boolean).join(' '),
  ];

  const nombreValido = candidatos.find(
    (valor) => typeof valor === 'string' && valor.trim().length > 0
  );

  if (nombreValido) {
    return { label: nombreValido.trim(), isLoading: false };
  }

  // Fallback: derivar algo legible del correo (antes del @).
  const correo: string | undefined = user.correo || user.email;
  if (typeof correo === 'string' && correo.includes('@')) {
    const usuarioCorreo = correo.split('@')[0].replace(/[._-]+/g, ' ').trim();
    if (usuarioCorreo.length > 0) {
      const capitalizado = usuarioCorreo
        .split(' ')
        .filter(Boolean)
        .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
      return { label: capitalizado, isLoading: false };
    }
  }

  // Último recurso: nunca dejar el label vacío o "undefined".
  return { label: 'Docente', isLoading: false };
}