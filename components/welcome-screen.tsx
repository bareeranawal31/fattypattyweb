"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { MapPin, ShoppingBag, ChevronDown, Store } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminSettings } from '@/lib/admin-settings'
import { useOrder } from '@/lib/order-context'
import { cn } from '@/lib/utils'

export function WelcomeScreen() {
  const {
    setOrderType,
    setSelectedArea,
    setSelectedBranch,
    setHasCompletedSetup,
    deliveryAreas,
    branches,
  } = useOrder()
  const settings = useAdminSettings()
  const [orderMode, setOrderMode] = useState<'delivery' | 'takeaway'>('delivery')
  const [selectedAreaValue, setSelectedAreaValue] = useState('')
  const [selectedBranchValue, setSelectedBranchValue] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!settings.isDeliveryEnabled && settings.isPickupEnabled) {
      setOrderMode('takeaway')
      setIsDropdownOpen(false)
    }
  }, [settings.isDeliveryEnabled, settings.isPickupEnabled])

  const handleContinue = () => {
    if (orderMode === 'delivery' && selectedAreaValue) {
      setOrderType('delivery')
      setSelectedArea(selectedAreaValue)
      setHasCompletedSetup(true)
    } else if (orderMode === 'takeaway' && selectedBranchValue) {
      setOrderType('pickup')
      setSelectedBranch(selectedBranchValue)
      setHasCompletedSetup(true)
    }
  }

  const canContinue = orderMode === 'delivery' ? !!selectedAreaValue : !!selectedBranchValue

  if (!mounted) return null

  if (!settings.isAcceptingOrders) {
    return (
      <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF8F0] via-[#FFE8D6] to-[#FFDAB9] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-2xl backdrop-blur-sm">
          <h1 className="font-serif text-3xl font-bold text-[#1a1a1a]">Ordering is currently closed</h1>
          <p className="mt-3 text-sm text-[#6b6b6b]">Please check back later or contact the store for updates.</p>
          <p className="mt-2 text-sm font-semibold text-[#C1121F]">{settings.storePhone}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-gradient-to-br from-[#FFF8F0] via-[#FFE8D6] to-[#FFDAB9] px-4 pb-10 pt-32">
      {/* Subtle decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[#FCA311]/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-[#C1121F]/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-lg"
      >
        {/* Logo — round, professional */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 mt-4 flex justify-center"
        >
          <div className="relative h-36 w-36 overflow-hidden rounded-full ring-4 ring-white/80 shadow-2xl">
            <Image
              src="/images/logo.png"
              alt="Fatty Patty"
              fill
              sizes="144px"
              className="object-cover"
              priority
            />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8 text-center"
        >
          <h1 className="font-serif text-3xl font-bold text-[#1a1a1a] md:text-4xl">
            How would you like to order?
          </h1>
          <p className="mt-2 text-base text-[#6b6b6b]">
            Choose your order type to get started
          </p>
        </motion.div>

        {/* Order Type Selection */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6 grid grid-cols-2 gap-4"
        >
          {/* Delivery Card */}
          <button
            onClick={() => setOrderMode('delivery')}
            disabled={!settings.isDeliveryEnabled}
            className={cn(
              'group relative flex flex-col items-center gap-3 rounded-2xl border-2 bg-white p-6 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45',
              orderMode === 'delivery'
                ? 'border-[#C1121F] bg-[#C1121F]/5 shadow-lg'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            )}
          >
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-xl transition-colors',
              orderMode === 'delivery'
                ? 'bg-[#C1121F]'
                : 'bg-gray-100 group-hover:bg-gray-200'
            )}>
              <MapPin className={cn(
                'h-7 w-7',
                orderMode === 'delivery' ? 'text-white' : 'text-gray-500'
              )} />
            </div>
            <div className="text-center">
              <p className={cn(
                'text-lg font-semibold',
                orderMode === 'delivery' ? 'text-[#1a1a1a]' : 'text-gray-700'
              )}>
                Delivery
              </p>
              <p className="mt-0.5 text-sm text-gray-500">
                {settings.isDeliveryEnabled ? 'To your doorstep' : 'Currently unavailable'}
              </p>
            </div>
          </button>

          {/* Takeaway Card */}
          <button
            onClick={() => setOrderMode('takeaway')}
            disabled={!settings.isPickupEnabled}
            className={cn(
              'group relative flex flex-col items-center gap-3 rounded-2xl border-2 bg-white p-6 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45',
              orderMode === 'takeaway'
                ? 'border-[#C1121F] bg-[#C1121F]/5 shadow-lg'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            )}
          >
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-xl transition-colors',
              orderMode === 'takeaway'
                ? 'bg-[#C1121F]'
                : 'bg-gray-100 group-hover:bg-gray-200'
            )}>
              <ShoppingBag className={cn(
                'h-7 w-7',
                orderMode === 'takeaway' ? 'text-white' : 'text-gray-500'
              )} />
            </div>
            <div className="text-center">
              <p className={cn(
                'text-lg font-semibold',
                orderMode === 'takeaway' ? 'text-[#1a1a1a]' : 'text-gray-700'
              )}>
                Takeaway
              </p>
              <p className="mt-0.5 text-sm text-gray-500">
                {settings.isPickupEnabled ? 'Pick up at store' : 'Currently unavailable'}
              </p>
            </div>
          </button>
        </motion.div>

        {/* Delivery Area Dropdown */}
        <AnimatePresence mode="wait">
          {orderMode === 'delivery' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">
                Select your area
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-2xl border-2 bg-white px-4 py-4 text-left transition-all',
                    isDropdownOpen || selectedAreaValue
                      ? 'border-[#C1121F]'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <span className={selectedAreaValue ? 'text-[#1a1a1a]' : 'text-gray-400'}>
                    {selectedAreaValue || 'Choose your delivery area'}
                  </span>
                  <ChevronDown className={cn(
                    'h-5 w-5 text-gray-400 transition-transform',
                    isDropdownOpen && 'rotate-180'
                  )} />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl"
                    >
                      {deliveryAreas.map((area) => (
                        <button
                          key={area}
                          onClick={() => {
                            setSelectedAreaValue(area)
                            setIsDropdownOpen(false)
                          }}
                          className={cn(
                            'flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors',
                            selectedAreaValue === area
                              ? 'bg-[#C1121F]/10 text-[#C1121F] font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          {area}
                          {selectedAreaValue === area && (
                            <div className="h-2 w-2 rounded-full bg-[#C1121F]" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Branch Selection for Takeaway */}
        <AnimatePresence mode="wait">
          {orderMode === 'takeaway' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <label className="mb-2 block text-sm font-medium text-[#1a1a1a]">
                Select branch for pickup
              </label>
              <div className="space-y-3">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => setSelectedBranchValue(branch.id)}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition-all',
                      selectedBranchValue === branch.id
                        ? 'border-[#C1121F] bg-[#C1121F]/5 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    )}
                  >
                    <div className={cn(
                      'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-colors',
                      selectedBranchValue === branch.id
                        ? 'bg-[#C1121F]'
                        : 'bg-gray-100'
                    )}>
                      <Store className={cn(
                        'h-6 w-6',
                        selectedBranchValue === branch.id ? 'text-white' : 'text-gray-500'
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        'font-semibold',
                        selectedBranchValue === branch.id ? 'text-[#1a1a1a]' : 'text-gray-700'
                      )}>
                        {branch.name}
                      </p>
                      <p className="text-sm text-gray-500">{branch.address}</p>
                    </div>
                    {selectedBranchValue === branch.id && (
                      <div className="h-3 w-3 rounded-full bg-[#C1121F]" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          onClick={handleContinue}
          disabled={!canContinue}
          className={cn(
            'w-full rounded-2xl py-4 text-lg font-semibold text-white transition-all',
            canContinue
              ? 'bg-[#C1121F] hover:bg-[#a00f1a] shadow-lg hover:shadow-xl active:scale-[0.98]'
              : 'bg-gray-300 cursor-not-allowed'
          )}
        >
          Continue
        </motion.button>

        {/* Footer text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 text-center text-xs text-gray-500"
        >
          Original Taste Since 2020
        </motion.p>
      </motion.div>
    </div>
  )
}
