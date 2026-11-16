// Fondo compartido de las pantallas sin sesión (login/registro): navy sólido
// + cuadrícula sutil + 3 orbes de color flotando, igual que login.html y
// registro.html en el v2 original.
export function FondoAuth() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-grid" aria-hidden>
      <div className="animate-orb absolute rounded-full blur-[80px] opacity-20 bg-[#1a4fd6] w-[min(500px,60vw)] h-[min(500px,60vw)] -top-36 -left-36" />
      <div
        className="animate-orb absolute rounded-full blur-[80px] opacity-20 bg-gold w-[min(400px,55vw)] h-[min(400px,55vw)] -bottom-28 -right-24"
        style={{ animationDelay: "-3s" }}
      />
      <div
        className="animate-orb absolute rounded-full blur-[80px] opacity-20 bg-[#7c3aed] w-[min(300px,45vw)] h-[min(300px,45vw)] top-[40%] left-[60%]"
        style={{ animationDelay: "-6s" }}
      />
    </div>
  );
}
