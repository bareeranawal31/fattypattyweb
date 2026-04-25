import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from 'next-themes'
import { CartProvider } from '@/lib/cart-context'
import { OrderProvider } from '@/lib/order-context'
import { CustomerAuthProvider } from '@/lib/customer-auth-context'
import { StorageInit } from '@/components/storage-init'
import { AnimationInit } from '@/components/animation-init'
import { FloatingActions } from '@/components/floating-actions'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Fatty Patty | Original Taste - Premium Burgers Since 2020',
  description: 'Premium smashed burgers, loaded fries and signature bowls. Order online for delivery or pickup from Fatty Patty - Karachi\'s favorite burger spot.',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#C1121F',
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <StorageInit />
        <AnimationInit />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <CustomerAuthProvider>
            <OrderProvider>
              <CartProvider>
                {children}
                <FloatingActions />
                <Toaster position="bottom-right" richColors />
              </CartProvider>
            </OrderProvider>
          </CustomerAuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
