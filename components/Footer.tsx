import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-brand-dark text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-brand-red rounded flex items-center justify-center font-black text-xs text-white">
                #
              </div>
              <span className="font-black text-lg text-white tracking-tight">
                All You Need Is <span className="text-brand-red">Lists</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              Your go-to destination for the best lists on the internet. Discover top 5s, top 10s, and everything in between.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Browse</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Latest Posts</Link></li>
              <li><Link href="/category/entertainment" className="hover:text-white transition-colors">Entertainment</Link></li>
              <li><Link href="/category/lifestyle" className="hover:text-white transition-colors">Lifestyle</Link></li>
              <li><Link href="/category/technology" className="hover:text-white transition-colors">Technology</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">About</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-sm text-center">
          <p>© {currentYear} All You Need Is Lists. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
