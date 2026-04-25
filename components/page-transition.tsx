'use client'

import { ReactNode, useEffect, useState } from 'react'

interface PageTransitionProps {
  children: ReactNode
  animate?: boolean
}

/**
 * Wraps page content to add enter/exit animations
 * Use this at the root of each page for smooth transitions
 */
export function PageTransition({ children, animate = true }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div
      className={animate ? 'page-enter' : ''}
      style={{
        animation: animate && isVisible ? 'pageEnter 0.5s ease-out' : 'none'
      }}
    >
      {children}
    </div>
  )
}

/**
 * Higher-order component to wrap pages with transitions
 * Usage: const PageWithTransition = withPageTransition(YourPage)
 */
export function withPageTransition<P extends object>(
  Component: React.ComponentType<P>
) {
  return function TransitionedComponent(props: P) {
    return (
      <PageTransition>
        <Component {...props} />
      </PageTransition>
    )
  }
}
