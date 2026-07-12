import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/category/about-us',
        destination: '/about',
        permanent: true,
      },
      {
        source: '/about-us',
        destination: '/about',
        permanent: true,
      },
      // Chicago sports fan post — old thin WP posts replaced by AI refresh
      {
        source: '/lifestyle/5-places-to-visit-in-chicago-if-youre-a-sports-fan',
        destination: '/lifestyle/chicago-sports-fan-spots',
        permanent: true,
      },
      {
        source: '/lifestyle/travel/5-places-to-visit-in-chicago-if-youre-a-sports-fan',
        destination: '/lifestyle/chicago-sports-fan-spots',
        permanent: true,
      },
      {
        source: '/lifestyle/travel-leisure/5-places-to-visit-in-chicago-if-youre-a-sports-fan',
        destination: '/lifestyle/chicago-sports-fan-spots',
        permanent: true,
      },
      // Busiest airports posts — 3 old thin WP duplicates consolidated into one AI-refreshed article
      {
        source: '/world-business/25-biggest-busiest-airports-world-yearly-passengers',
        destination: '/business/busiest-airports-passenger-rankings',
        permanent: true,
      },
      {
        source: '/world-business/10-biggest-airports-world-yearly-passengers',
        destination: '/business/busiest-airports-passenger-rankings',
        permanent: true,
      },
      {
        source: '/world-business/busiest-airports-in-the-world',
        destination: '/business/busiest-airports-passenger-rankings',
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'allyouneedislists.com',
      },
    ],
  },
}

export default nextConfig
