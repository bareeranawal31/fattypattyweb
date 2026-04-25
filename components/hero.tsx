"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useAdminSettings } from '@/lib/admin-settings'

export function Hero() {
  const settings = useAdminSettings()

  return (
    <section id="home" className="relative min-h-[92vh] overflow-hidden bg-gradient-to-b from-[#1a1a1a] via-[#1a1a1a] to-background md:min-h-screen">
      <div className="absolute inset-0">
        <Image
          src="/images/hero-burger.jpg"
          alt="Premium burger"
          fill
          priority
          className="object-cover object-center opacity-65"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a]/58 via-[#1a1a1a]/42 to-[#1a1a1a]/58" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,200,130,0.12)_0%,rgba(0,0,0,0)_55%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-6xl flex-col items-center justify-center px-4 pt-20 text-center sm:px-6 md:min-h-screen md:pt-0 lg:px-12">
        <div className="fade-in-up w-full rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 to-white/4 px-5 py-10 shadow-2xl backdrop-blur-2xl transition-all duration-700 hover:border-white/20 hover:from-white/12 hover:to-white/6 sm:px-8 sm:py-14 md:max-w-5xl md:px-14 md:py-20 lg:py-24">
          <span className="mb-5 inline-block rounded-full border border-[#F4A261]/20 bg-gradient-to-r from-[#F4A261]/30 to-[#C1121F]/20 px-4 py-1.5 text-[11px] font-bold tracking-wider text-[#F4A261] animate-delay-1 fade-in-up sm:px-5 sm:py-2 sm:text-xs">
            ESTD 2020 • PREMIUM QUALITY
          </span>

          <h1 className="mb-6 space-y-2.5 font-serif text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:mb-8 md:text-7xl lg:text-8xl animate-delay-2">
            <span className="block text-balance fade-in-up">Original Taste.</span>
            <span className="block text-balance bg-gradient-to-r from-[#F4A261] to-[#FFB380] bg-clip-text text-transparent fade-in-up" style={{ animationDelay: '0.1s' }}>
              Ultimate Burgers.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-sm font-light leading-relaxed text-pretty text-white/75 sm:text-base md:mb-12 md:text-lg lg:text-xl animate-delay-3 fade-in-up">
            Handcrafted smashed burgers, loaded fries, signature bowls and authentic flavors crafted with passion since 2020.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5 animate-delay-4 fade-in-up">
            <Link
              href={settings.isAcceptingOrders ? '/menu' : '#contact'}
              className="inline-flex w-full items-center justify-center rounded-full border border-[#FF4A4A]/30 bg-gradient-to-r from-[#C1121F] via-[#D91E2B] to-[#A00D1B] px-8 py-3.5 text-sm font-bold tracking-wide text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_18px_45px_rgba(193,18,31,0.55)] active:scale-95 sm:w-auto sm:px-12 sm:py-4.5"
            >
              {settings.isAcceptingOrders ? 'Order Now' : 'Ordering Closed'}
            </Link>

            <Link
              href="/menu"
              className="inline-flex w-full items-center justify-center rounded-full border-2 border-white/30 bg-white/12 px-8 py-3.5 text-sm font-bold tracking-wide text-white backdrop-blur-lg transition-all duration-300 hover:bg-white/20 hover:border-white/60 active:scale-95 sm:w-auto sm:px-12 sm:py-4.5"
            >
              Explore Menu
            </Link>
          </div>

          <div className="fade-in-up mt-5 flex flex-col items-center justify-center gap-2.5 sm:mt-6 sm:flex-row sm:gap-5" style={{ animationDelay: '0.36s' }}>
            <div className="inline-flex items-center gap-1.5 text-sm text-white/92">
              <span className="text-[#ffc56f]">★</span>
              <span className="font-semibold">4.8 Rating</span>
            </div>
            <p className="text-sm text-white/70">Loved by 10,000+ burger fans</p>
          </div>
        </div>
      </div>

    </section>
  )
}
