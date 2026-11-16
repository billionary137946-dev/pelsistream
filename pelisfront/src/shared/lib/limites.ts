// Límites de cada campo. UN solo lugar: los usa el servidor (lib/server/validar.ts, la seguridad real)
// y la pantalla (maxLength, filtros y mensajes). Si cambias uno, cambia en los dos lados a la vez.
export const LIMITES = {
  celular: 10,
  contrasenaMin: 8,
  contrasenaMax: 72, // bcrypt solo usa los primeros 72 bytes
  alias: 40,
  nombreNegocio: 40,
  nombreEvento: 60,
  numeroJugada: 4, // dígitos del N# de jugada
  nombreEquipo: 30,
  nombreApostador: 40,
  carta: 20,
  puntos: 3, // dígitos de los puntos en Pares y nones
  lugares: 3, // dígitos del total de lugares de una quiniela
  apuestaMin: 500,
  apuestaMax: 1_000_000,
  dineroMax: 100_000_000,
  maxOperadores: 50,
  apostadoresMax: 200,
} as const;
