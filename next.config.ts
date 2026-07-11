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
