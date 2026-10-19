/** Атмосфера как на prllx.link: цветные blurs + film grain. */
export function SiteAtmosphere({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={
        className ??
        "pointer-events-none fixed inset-0 z-0 overflow-hidden"
      }
    >
      <div className="absolute -left-1/4 top-0 h-[55vh] w-[70vw] rounded-full bg-[#E2532F]/18 blur-[120px]" />
      <div className="absolute -right-1/4 top-1/3 h-[45vh] w-[55vw] rounded-full bg-[#4F8CFF]/12 blur-[100px]" />
      <div className="absolute bottom-0 left-1/3 h-[40vh] w-[40vw] rounded-full bg-[#C8F542]/08 blur-[90px]" />
      <div className="sl-film-grain absolute inset-0 opacity-40" />
    </div>
  )
}
