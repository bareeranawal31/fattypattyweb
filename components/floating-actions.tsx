'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowUp, LocateFixed } from 'lucide-react'

export function FloatingActions() {
  const pathname = usePathname()
  const [showTopButton, setShowTopButton] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setShowTopButton(window.scrollY > 300)
    }

    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (pathname.startsWith('/admin')) {
    return null
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2">
      <Link
        href="/track"
        className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-gradient-to-r from-[#c1121f]/92 to-[#a80f1b]/92 px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:from-[#d21a2a]/95 hover:to-[#b6121f]/95"
      >
        <LocateFixed className="h-4 w-4" />
        Track Order
      </Link>

      {showTopButton && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="inline-flex items-center justify-center rounded-full border border-border bg-card p-3 text-foreground shadow-lg transition-all hover:scale-105 hover:bg-muted"
          aria-label="Back to top"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
