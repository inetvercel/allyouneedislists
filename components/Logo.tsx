import { ListOrdered } from 'lucide-react'

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="relative flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden ring-1 ring-white/20"
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 30% 25%, #ff9a6e 0%, #E63946 55%, #c81f2d 100%)',
        boxShadow: '0 2px 10px rgba(230,57,70,0.55), inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.25)',
      }}
    >
      {/* glossy top highlight */}
      <span
        className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(255,255,255,0))' }}
      />
      <ListOrdered
        size={Math.round(size * 0.56)}
        strokeWidth={2.6}
        className="relative text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
      />
    </span>
  )
}

export default function Logo({ size = 32, textClassName = 'text-[16px]' }: { size?: number; textClassName?: string }) {
  return (
    <>
      <LogoMark size={size} />
      <span className={`font-extrabold tracking-tight whitespace-nowrap leading-none ${textClassName}`}>
        <span className="text-white">AllYouNeedIs</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E63946] to-[#ff8a5c]">Lists</span>
      </span>
    </>
  )
}
