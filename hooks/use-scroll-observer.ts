import { useEffect } from 'react'

/**
 * Hook to trigger animations when elements scroll into view
 * Adds animation classes to elements with data-scroll-animate attribute
 */
export function useScrollObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const animationType = entry.target.getAttribute('data-scroll-animate')
            const delay = entry.target.getAttribute('data-scroll-delay')

            if (animationType) {
              entry.target.classList.add(`scroll-${animationType}`)
              if (delay) {
                ;(entry.target as HTMLElement).style.animationDelay = delay
              }
            }

            // Once animated, stop observing
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    // Observe all elements marked for scroll animation
    const scrollElements = document.querySelectorAll('[data-scroll-animate]')
    scrollElements.forEach((el) => observer.observe(el))

    return () => {
      scrollElements.forEach((el) => observer.unobserve(el))
    }
  }, [])
}

/**
 * Alternative hook for watching a specific element
 */
export function useScrollObserverElement(elementRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!elementRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-fade-in-up')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    observer.observe(elementRef.current)
    return () => observer.disconnect()
  }, [elementRef])
}
