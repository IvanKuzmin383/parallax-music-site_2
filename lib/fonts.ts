import { Inter, Roboto } from "next/font/google"

/** Self-hosted at build time (no runtime request to fonts.googleapis.com). */
export const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
})

export const roboto = Roboto({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-roboto",
})

export const fontClassNames = `${inter.variable} ${roboto.variable}`
