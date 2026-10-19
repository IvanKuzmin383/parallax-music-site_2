/** Атмосфера: blurs + film grain, акцент через --primary (фирменный красный). */
export function SiteAtmosphere({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={
        className ??
        "pointer-events-none fixed inset-0 z-0 overflow-hidden"
      }
    >
      <div className="absolute -left-1/4 top-0 h-[55vh] w-[70vw] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute -right-1/4 top-1/3 h-[45vh] w-[55vw] rounded-full bg-[#4F8CFF]/10 blur-[100px]" />
      <div className="absolute bottom-0 left-1/3 h-[40vh] w-[40vw] rounded-full bg-primary/10 blur-[90px]" />
      <div className="sl-film-grain absolute inset-0 opacity-40" />
    </div>
  )
}
