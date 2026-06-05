import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://parallaxmusic.ru'
  
  return {
    rules: {
      userAgent: '*',
      allow: "/api/smartlink/",
      disallow: [
        '/api/',
        '/admin26081993/',
        '/cabinet',
        '/*?etext=',
        '/*&etext=',
        '/*?ybaip=',
        '/*&ybaip=',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

