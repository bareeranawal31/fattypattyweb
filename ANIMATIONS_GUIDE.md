# Advanced Animation System - Implementation Guide

## Overview

Your Fatty Patty food app now includes a comprehensive animation system with **4 major animation types**:

1. **Scroll-Triggered Animations** - Fade in elements as they enter the viewport
2. **Page Transition Animations** - Smooth animations when navigating between pages
3. **Loading Spinner Animations** - Custom animated loaders with dual-ring design
4. **Dropdown Menu Animations** - Smooth open/close for menus and dropdowns

---

## 1. Scroll-Triggered Animations

### How It Works

Elements automatically animate as they scroll into view using the Intersection Observer API.

### Implementation

#### In Components (HTML Elements)

Add `data-scroll-animate` and optional `data-scroll-delay` attributes:

```jsx
<section data-scroll-animate="fade-in-up">
  {/* Content animates up when scrolling into view */}
</section>

<div data-scroll-animate="fade-in-left" data-scroll-delay="0.2s">
  {/* Slides in from left with 0.2s delay */}
</div>
```

#### Animation Types Available

- `fade-in-up` - Fades in while sliding up (default)
- `fade-in-left` - Fades in while sliding from left
- `fade-in-right` - Fades in while sliding from right
- `fade-in-down` - Fades in while sliding down

#### Example in page.tsx

```jsx
<div data-scroll-animate="fade-in-up" data-scroll-delay="0.1s">
  <Categories />
</div>
```

#### Using the Hook (Advanced)

```jsx
'use client'

import { useScrollObserver } from '@/hooks/use-scroll-observer'

export function MyComponent() {
  useScrollObserver() // Activates scroll observer for this page

  return (
    <div data-scroll-animate="fade-in-up">
      {/* Content here */}
    </div>
  )
}
```

#### Watch Specific Element

```jsx
'use client'

import { useRef } from 'react'
import { useScrollObserverElement } from '@/hooks/use-scroll-observer'

export function MyComponent() {
  const ref = useRef<HTMLDivElement>(null)
  useScrollObserverElement(ref) // Triggers animation for this ref only

  return <div ref={ref}>{/* Content */}</div>
}
```

---

## 2. Page Transition Animations

### How It Works

Pages smoothly fade in with a slight upward movement when navigating.

### Implementation

#### Wrap Pages with PageTransition

```jsx
'use client'

import { PageTransition } from '@/components/page-transition'

export default function AboutPage() {
  return (
    <PageTransition>
      {/* Your page content */}
    </PageTransition>
  )
}
```

#### Using Higher-Order Component

```jsx
'use client'

import { withPageTransition } from '@/components/page-transition'

function AboutPageContent() {
  // Component logic here
  return <div>Content</div>
}

export default withPageTransition(AboutPageContent)
```

### CSS Classes Available

- `.page-enter` - Fade in (0.5s duration)
- `.page-exit` - Fade out (0.3s duration)

### Customize Duration (in globals.css)

```css
.page-enter {
  animation: pageEnter 0.3s ease-out; /* Change 0.5s to desired duration */
}
```

---

## 3. Loading Spinner Animations

### How It Works

Dual-ring spinner with bouncing center dot and animated loading text.

### Components Available

#### Full LoadingSpinner

```jsx
import { LoadingSpinner } from '@/components/loading-spinner'

// Default
<LoadingSpinner />

// With custom text
<LoadingSpinner text="Preparing your order..." />

// Full screen overlay
<LoadingSpinner fullScreen text="Loading..." />

// Small spinner
<LoadingSpinner size="sm" />

// Large spinner
<LoadingSpinner size="lg" />
```

#### Inline Spinner (for buttons)

```jsx
import { LoadingSpinnerInline } from '@/components/loading-spinner'

<button>
  <LoadingSpinnerInline />
  Processing...
</button>
```

### Props

**LoadingSpinner:**
- `size` - 'sm' (8px) | 'md' (12px) | 'lg' (16px) - default: 'md'
- `text` - Loading text to display
- `fullScreen` - Render as full-screen overlay - default: false

**LoadingSpinnerInline:**
- No props

### Example Usage

```jsx
'use client'

import { useState } from 'react'
import { LoadingSpinner } from '@/components/loading-spinner'

export function CheckoutPage() {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCheckout = async () => {
    setIsProcessing(true)
    // Process payment...
    setIsProcessing(false)
  }

  if (isProcessing) {
    return <LoadingSpinner fullScreen text="Processing payment..." />
  }

  return <button onClick={handleCheckout}>Checkout</button>
}
```

---

## 4. Dropdown Menu Animations

### How It Works

Dropdowns smoothly open and close with fade and slide animations.

### Components Available

#### AnimatedDropdown

```jsx
import { AnimatedDropdown, DropdownMenu } from '@/components/animated-dropdown'
import { Settings } from 'lucide-react'

<AnimatedDropdown label="Settings" icon={<Settings className="h-4 w-4" />}>
  <DropdownMenu
    items={[
      {
        label: 'Profile',
        onClick: () => console.log('Profile clicked'),
        icon: <User className="h-4 w-4" />
      },
      {
        label: 'Settings',
        onClick: () => console.log('Settings clicked'),
        icon: <Gear className="h-4 w-4" />
      },
      {
        label: 'Logout',
        onClick: () => console.log('Logout clicked')
      }
    ]}
  />
</AnimatedDropdown>
```

#### AnimatedTooltip

```jsx
import { AnimatedTooltip } from '@/components/animated-dropdown'
import { Info } from 'lucide-react'

<AnimatedTooltip
  trigger={<Info className="h-5 w-5 cursor-help" />}
  content="This is helpful information"
  position="top" // top | bottom | left | right
/>
```

### CSS Classes Available

- `.dropdown-open` - Smooth open animation (0.2s)
- `.dropdown-close` - Smooth close animation (0.2s)

### Mobile Menu Enhancement

The navbar mobile menu automatically uses dropdown animations:

```jsx
// Navbar already configured with:
className={cn(
  'overflow-hidden transition-all duration-300 lg:hidden',
  isMobileMenuOpen ? 'max-h-[500px] opacity-100 dropdown-open' : 'max-h-0 opacity-0'
)}
```

---

## Global Animation Configuration

### CSS Keyframes (in globals.css)

All animations are defined with standard durations:

- **Scroll animations**: 0.8s ease-out
- **Page transitions**: 0.5s (enter) / 0.3s (exit)
- **Dropdown animations**: 0.2s ease-out/in
- **Spinner**: 2s-3s continuous rotation

### Accessibility

Respects user's motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Users with `prefers-reduced-motion` enabled will experience instant UI changes instead of animations.

---

## CSS Classes Reference

### Scroll Animations

```css
.scroll-fade-in-up { /* Fade in from bottom */ }
.scroll-fade-in-left { /* Fade in from left */ }
.scroll-fade-in-right { /* Fade in from right */ }
```

### Page Transitions

```css
.page-enter { /* Page fade in */ }
.page-exit { /* Page fade out */ }
```

### Spinner Utilities

```css
.spinner { /* Clockwise rotation */ }
.spinner-reverse { /* Counter-clockwise rotation */ }
.bounce-ring { /* Bouncing ring effect */ }
```

### Dropdown

```css
.dropdown-open { /* Smooth open */ }
.dropdown-close { /* Smooth close */ }
```

### Staggered Delays

```css
.animate-delay-0 { /* 0ms */ }
.animate-delay-1 { /* 100ms */ }
.animate-delay-2 { /* 200ms */ }
.animate-delay-3 { /* 300ms */ }
.animate-delay-4 { /* 400ms */ }
.animate-delay-5 { /* 500ms */ }
```

---

## Implementation Checklist

✅ **Completed:**
- Added scroll-triggered animations across home page sections
- Page transition framework ready for all pages
- Loading spinner components created
- Dropdown animation system implemented
- Mobile menu dropdown animations active
- Accessibility fallbacks for reduced-motion

✅ **Enhanced Components:**
- `app/globals.css` - 150+ lines of animation definitions
- `app/page.tsx` - Scroll animation attributes added
- `components/navbar.tsx` - Mobile menu dropdown animation active
- `hooks/use-scroll-observer.ts` - New scroll observer hook
- `components/loading-spinner.tsx` - Custom spinner component
- `components/page-transition.tsx` - Page transition wrapper
- `components/animated-dropdown.tsx` - Dropdown components
- `components/animation-init.tsx` - Animation initialization

---

## Performance Tips

1. **Lazy Load Animations**: Use `data-scroll-animate` to load only visible elements
2. **Respect Motion Preferences**: Built-in `prefers-reduced-motion` support
3. **GPU Acceleration**: All animations use `transform` and `opacity` for smooth performance
4. **Debounced Scroll**: Intersection Observer automatically throttles updates

---

## Troubleshooting

### Scrollobserver Not Working
- Ensure `AnimationInit` component is in your layout
- Check that elements have `data-scroll-animate` attributes
- Verify page has enough height to scroll

### Page Transitions Not Showing
- Wrap page content with `<PageTransition>` component
- Test with client component (`'use client'`)

### Dropdown Not Animating
- Use `AnimatedDropdown` or `DropdownMenu` components
- Check that `.dropdown-open` class is applied

### Animations Not Respecting Reduced Motion
- Verify `@media (prefers-reduced-motion: reduce)` is in globals.css
- Test in browser: System Preferences → Accessibility → Reduce Motion

---

## Next Steps

1. **Wrap all pages** with `<PageTransition>` for consistent page animations
2. **Add loading spinners** to async operations (checkout, order tracking)
3. **Replace existing selects/menus** with `<AnimatedDropdown>` for better UX
4. **Monitor performance** using DevTools to ensure smooth 60fps animations

Example complete setup:

```jsx
// app/menu/page.tsx
'use client'

import { PageTransition } from '@/components/page-transition'
import { MenuContent } from '@/components/menu-content'

export default function MenuPage() {
  return (
    <PageTransition>
      <main data-scroll-animate="fade-in-up">
        <MenuContent />
      </main>
    </PageTransition>
  )
}
```

---

**Your Fatty Patty app now has enterprise-grade animations! 🎉**
