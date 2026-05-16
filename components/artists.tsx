import Image from "next/image"

const artists = [
  {
    name: "Nova Wave",
    genre: "Electronic",
    image: "/electronic-music-artist-performing-with-synthesize.jpg",
  },
  {
    name: "The Echoes",
    genre: "Indie Rock",
    image: "/indie-rock-band-performing-on-stage-dark-moody-lig.jpg",
  },
  {
    name: "Luna Sol",
    genre: "R&B",
    image: "/rnb-singer-performing-with-microphone-purple-light.jpg",
  },
  {
    name: "Voltage",
    genre: "Hip Hop",
    image: "/hip-hop-artist-in-recording-studio-urban-aesthetic.jpg",
  },
  {
    name: "Celestial",
    genre: "Pop",
    image: "/pop-artist-performing-colorful-stage-lights.jpg",
  },
  {
    name: "Midnight Drive",
    genre: "Alternative",
    image: "/alternative-rock-musician-with-guitar-dark-atmosph.jpg",
  },
]

export function Artists() {
  return (
    <section id="artists" className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">Our</span> <span className="text-primary">Artists</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Showcasing the diverse talent we work with across multiple genres and styles. Each artist brings unique
            energy and vision to the music landscape.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {artists.map((artist) => (
            <div
              key={artist.name}
              className="group relative overflow-hidden bg-secondary rounded-sm aspect-square cursor-pointer"
            >
              <Image
                src={artist.image || "/placeholder.svg"}
                alt={`${artist.name}, ${artist.genre} artist performing on stage`}
                fill
                className="object-cover"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform">
                <p className="text-sm uppercase tracking-wider text-primary mb-1">{artist.genre}</p>
                <h3 className="text-2xl font-bold uppercase tracking-wide">{artist.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
