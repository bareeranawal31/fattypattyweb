"use client"

import { useMemo, useState } from 'react'
import { MapPin, Phone, Clock, Send, Star } from 'lucide-react'
import { toast } from '@/lib/notify'
import { useAdminSettings } from '@/lib/admin-settings'
import { setStorageWithSync } from '@/lib/storage-sync'
import { DEFAULT_REVIEWS, type CustomerReview } from '@/lib/reviews-data'
import { LocationMap } from '@/components/location-map'

type MessageType = 'query' | 'complaint' | 'review'

interface BranchOption {
  id: string
  name: string
  address: string
  mapUrl: string
  embedSrc: string
  latitude?: number | null
  longitude?: number | null
}

const defaultBranchOptions: BranchOption[] = [
  {
    id: 'tipu-sultan',
    name: 'Fatty Patty - Habit City (Tipu Sultan Road)',
    address: 'Habit City, Tipu Sultan Road, Karachi',
    mapUrl: 'https://maps.app.goo.gl/Hknw3qL9pPM9NVXR9',
    embedSrc: 'https://www.google.com/maps?q=Fatty+Patty+Habit+City+Tipu+Sultan+Road+Karachi&output=embed',
    latitude: null,
    longitude: null,
  },
  {
    id: 'dha-phase-8',
    name: 'Fatty Patty - Creek Walk (DHA Phase 8)',
    address: 'Creek Walk, DHA Phase 8, Karachi',
    mapUrl: 'https://maps.app.goo.gl/ba7H9PA4BCyScHjv6',
    embedSrc: 'https://www.google.com/maps?q=Fatty+Patty+Creek+Walk+DHA+Phase+8+Karachi&output=embed',
    latitude: null,
    longitude: null,
  },
]

export function Contact() {
  const settings = useAdminSettings()
  const branchOptions = defaultBranchOptions
  const [selectedMapBranchId, setSelectedMapBranchId] = useState<string>(defaultBranchOptions[0]?.id || '')
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [messageType, setMessageType] = useState<MessageType>('query')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedBranch = useMemo(
    () => branchOptions.find((branch) => branch.id === selectedMapBranchId) || branchOptions[0] || null,
    [branchOptions, selectedMapBranchId],
  )

  const mapQuery = selectedBranch ? `${selectedBranch.name}, ${selectedBranch.address}` : 'Fatty Patty Karachi'
  const selectedBranchEmbedSrc = selectedBranch?.embedSrc

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (messageType === 'review' && rating === 0) {
      toast.error('Please select a star rating for your review')
      return
    }
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    if (messageType === 'review') {
      const initials = formData.name.trim().split(/\s+/).slice(0, 2).map((n: string) => n[0]?.toUpperCase() ?? '').join('')
      const newReview: CustomerReview = {
        id: `contact-review-${Date.now()}`,
        name: formData.name.trim(),
        rating,
        review: formData.message.trim(),
        initial: initials || 'NA',
        isVisible: false,
        createdAt: new Date().toISOString(),
      }
      const stored = localStorage.getItem('customerReviews')
      const existing: CustomerReview[] = stored ? JSON.parse(stored) : DEFAULT_REVIEWS
      setStorageWithSync('customerReviews', JSON.stringify([newReview, ...existing]))
    }
    const typeLabel = messageType === 'review' ? 'Review' : messageType === 'complaint' ? 'Complaint' : 'Query'
    toast.success(`${typeLabel} sent successfully! We\'ll get back to you soon.`)
    setFormData({ name: '', email: '', message: '' })
    setRating(0)
    setHoverRating(0)
    setIsSubmitting(false)
  }

  return (
    <section id="contact" className="bg-gradient-to-b from-background via-muted/10 to-background py-16 md:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        <div className="mb-12 text-center fade-in-up md:mb-16">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#C1121F] animate-pulse">
            📍 Connect With Us
          </span>
          <h2 className="font-serif text-3xl font-bold text-foreground mb-4 sm:text-4xl md:text-5xl lg:text-6xl">
            Get In Touch
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">Visit us, call us, or drop us a message - we're here for you</p>
        </div>

        <div className="grid gap-8 md:gap-10 lg:grid-cols-2">
          <div className="space-y-8 fade-in-left">
            {/* Map */}
            <div className="overflow-hidden rounded-3xl border border-border/60 shadow-2xl hover:shadow-3xl transition-all duration-300 group">
              {branchOptions.length > 1 && (
                <div className="border-b border-border/50 bg-card/60 px-3 py-3">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Select Branch
                  </label>
                  <select
                    value={selectedMapBranchId}
                    onChange={(e) => setSelectedMapBranchId(e.target.value)}
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:border-[#C1121F] focus:outline-none"
                  >
                    {branchOptions.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  {selectedBranch && (
                    <a
                      href={selectedBranch.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-semibold text-[#C1121F] underline-offset-4 hover:underline"
                    >
                      Open selected branch in Google Maps: {selectedBranch.name}
                    </a>
                  )}
                </div>
              )}
              <LocationMap
                branches={branchOptions}
                center={
                  selectedBranch && Number.isFinite(selectedBranch.latitude) && Number.isFinite(selectedBranch.longitude)
                    ? { lat: Number(selectedBranch.latitude), lng: Number(selectedBranch.longitude) }
                    : null
                }
                fallbackQuery={mapQuery}
                forceIframeSrc={selectedBranchEmbedSrc}
                height={280}
                className="transition-transform duration-300 group-hover:scale-105 w-full"
                onBranchMarkerClick={setSelectedMapBranchId}
              />
            </div>

            {/* Contact Cards */}
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
              <div className="group flex flex-col items-start gap-4 rounded-3xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 p-5 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:border-[#C1121F]/50 fade-in-up backdrop-blur-sm sm:gap-5 sm:p-7">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C1121F]/30 to-[#F4A261]/20 group-hover:from-[#C1121F]/40 group-hover:to-[#F4A261]/30 transition-all">
                  <MapPin className="h-7 w-7 text-[#C1121F]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground group-hover:text-[#C1121F] transition-colors">Our Locations</p>
                  {branchOptions.map((branch, index) => (
                    <div
                      key={branch.id}
                      className={`mt-3 flex flex-col gap-1 text-sm leading-relaxed text-muted-foreground ${index === 0 ? 'font-medium' : ''}`}
                    >
                      <p>📍 {branch.name} - {branch.address}</p>
                      <a
                        href={branch.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#C1121F] underline-offset-4 hover:underline"
                      >
                        Open in Maps: {branch.name}
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="group flex flex-col items-start gap-4 rounded-3xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 p-5 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:border-[#C1121F]/50 fade-in-up backdrop-blur-sm sm:gap-5 sm:p-7">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C1121F]/30 to-[#F4A261]/20 group-hover:from-[#C1121F]/40 group-hover:to-[#F4A261]/30 transition-all">
                  <Phone className="h-7 w-7 text-[#C1121F]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground group-hover:text-[#C1121F] transition-colors">Call or WhatsApp</p>
                  <p className="text-sm leading-relaxed text-muted-foreground mt-3 font-bold text-base">📱 {settings.storePhone}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">Available on WhatsApp</p>
                </div>
              </div>

              <div className="sm:col-span-2 group flex flex-col items-start gap-4 rounded-3xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 p-5 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:border-[#C1121F]/50 fade-in-up backdrop-blur-sm sm:gap-5 sm:p-7">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C1121F]/30 to-[#F4A261]/20 group-hover:from-[#C1121F]/40 group-hover:to-[#F4A261]/30 transition-all">
                  <Clock className="h-7 w-7 text-[#C1121F]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground group-hover:text-[#C1121F] transition-colors">Opening Hours</p>
                  <p className="text-sm leading-relaxed text-muted-foreground mt-3 font-medium">🕐 Monday - Sunday</p>
                  <p className="text-sm font-bold text-[#C1121F] mt-1">12:00 PM - 1:00 AM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 p-5 shadow-lg hover:shadow-2xl transition-all duration-300 fade-in-right backdrop-blur-sm sm:p-7 md:p-8">
            <h3 className="mb-6 font-serif text-2xl font-bold text-foreground sm:mb-8 sm:text-3xl">Send Us a Message</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Message Type Selector */}
              <div className="fade-in-up">
                <label className="mb-3 block text-sm font-bold text-foreground">What can we help you with?</label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                  {([
                    { value: 'query', label: '❓ Query' },
                    { value: 'complaint', label: '⚠️ Complaint' },
                    { value: 'review', label: '⭐ Review' },
                  ] as { value: MessageType; label: string }[]).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setMessageType(value); setRating(0); setHoverRating(0) }}
                      className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                        messageType === value
                          ? 'border-[#C1121F] bg-[#C1121F]/10 text-[#C1121F]'
                          : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-[#C1121F]/40 hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fade-in-up">
                <label htmlFor="name" className="mb-3 block text-sm font-bold text-foreground">Your Name</label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-border/60 bg-muted/20 px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/40 transition-all duration-300 hover:border-border/80"
                  placeholder="John Doe"
                />
              </div>
              <div className="fade-in-up animate-delay-1">
                <label htmlFor="email" className="mb-3 block text-sm font-bold text-foreground">Email Address</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-2xl border border-border/60 bg-muted/20 px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/40 transition-all duration-300 hover:border-border/80"
                  placeholder="your@email.com"
                />
              </div>
              <div className="fade-in-up animate-delay-2">
                <label htmlFor="message" className="mb-3 block text-sm font-bold text-foreground">
                  {messageType === 'review' ? 'Your Review' : messageType === 'complaint' ? 'Describe Your Issue' : 'Your Message'}
                </label>

                {/* Star Rating — only for review */}
                {messageType === 'review' && (
                  <div className="mb-4">
                    <p className="mb-2 text-sm text-muted-foreground">Rate your experience</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const starValue = i + 1
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setRating(starValue)}
                            onMouseEnter={() => setHoverRating(starValue)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                            aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
                          >
                            <Star
                              className={`h-8 w-8 transition-colors duration-150 ${
                                starValue <= (hoverRating || rating)
                                  ? 'fill-[#F4A261] text-[#F4A261]'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          </button>
                        )
                      })}
                      {rating > 0 && (
                        <span className="ml-2 text-sm font-medium text-[#F4A261]">
                          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <textarea
                  id="message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  className="w-full resize-none rounded-2xl border border-border/60 bg-muted/20 px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-[#C1121F] focus:outline-none focus:ring-2 focus:ring-[#C1121F]/40 transition-all duration-300 hover:border-border/80"
                  placeholder={
                    messageType === 'review'
                      ? 'Tell us about your experience...'
                      : messageType === 'complaint'
                      ? 'Describe your issue in detail...'
                      : 'Tell us what\'s on your mind...'
                  }
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="fade-in-up animate-delay-3 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#C1121F] via-[#D91E2B] to-[#A00D1B] px-6 py-4 text-sm font-bold text-white transition-all duration-300 hover:shadow-2xl hover:shadow-[#C1121F]/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed border border-[#FF4A4A]/30 hover:border-[#FF6B6B]/60"
              >
                <Send className="h-5 w-5" />
                {isSubmitting
                  ? 'Sending...'
                  : messageType === 'review'
                  ? 'Submit Review'
                  : messageType === 'complaint'
                  ? 'Send Complaint'
                  : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
