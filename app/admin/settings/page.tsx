"use client"

import { useEffect, useState } from 'react'
import { Save, Store, Clock, DollarSign, Plus, Trash2, TicketPercent } from 'lucide-react'
import { toast } from '@/lib/notify'
import { setStorageWithSync } from '@/lib/storage-sync'
import {
  type AdminSettings,
  type CouponType,
  SETTINGS_STORAGE_KEY,
  defaultAdminSettings,
  parseAdminSettings,
} from '@/lib/admin-settings'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(defaultAdminSettings)
  const [newCoupon, setNewCoupon] = useState<{ code: string; type: CouponType; value: number }>({
    code: '',
    type: 'percentage',
    value: 10,
  })

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
        if (!stored) {
          setStorageWithSync(SETTINGS_STORAGE_KEY, JSON.stringify(defaultAdminSettings))
          setSettings(defaultAdminSettings)
        } else {
          setSettings(parseAdminSettings(stored))
        }
      } catch {
        setSettings(defaultAdminSettings)
      }
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      setStorageWithSync(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const addCoupon = () => {
    const normalizedCode = newCoupon.code.trim().toUpperCase()
    if (!normalizedCode) {
      toast.error('Enter a coupon code')
      return
    }
    if (newCoupon.value <= 0) {
      toast.error('Coupon value must be greater than 0')
      return
    }
    if (newCoupon.type === 'percentage' && newCoupon.value > 100) {
      toast.error('Percentage coupon cannot exceed 100')
      return
    }
    if (settings.coupons.some((coupon) => coupon.code === normalizedCode)) {
      toast.error('Coupon code already exists')
      return
    }

    setSettings((prev) => ({
      ...prev,
      coupons: [
        ...prev.coupons,
        {
          id: `coupon-${Date.now()}`,
          code: normalizedCode,
          type: newCoupon.type,
          value: newCoupon.value,
          isActive: true,
        },
      ],
    }))
    setNewCoupon({ code: '', type: 'percentage', value: 10 })
  }

  const toggleCoupon = (couponId: string) => {
    setSettings((prev) => ({
      ...prev,
      coupons: prev.coupons.map((coupon) =>
        coupon.id === couponId ? { ...coupon, isActive: !coupon.isActive } : coupon
      ),
    }))
  }

  const removeCoupon = (couponId: string) => {
    setSettings((prev) => ({
      ...prev,
      coupons: prev.coupons.filter((coupon) => coupon.id !== couponId),
    }))
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your store settings</p>
      </div>

      {/* Store Information */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-red/10">
            <Store className="h-5 w-5 text-brand-red" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Store Information</h2>
            <p className="text-sm text-muted-foreground">Basic store details</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Store Name</label>
            <input
              type="text"
              value={settings.storeName}
              onChange={(e) => setSettings(s => ({ ...s, storeName: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Phone</label>
              <input
                type="tel"
                value={settings.storePhone}
                onChange={(e) => setSettings(s => ({ ...s, storePhone: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={settings.storeEmail}
                onChange={(e) => setSettings(s => ({ ...s, storeEmail: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Delivery & Pricing</h2>
            <p className="text-sm text-muted-foreground">Configure delivery fees and minimum order</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Delivery Fee (Rs.)</label>
              <input
                type="number"
                value={settings.deliveryFee}
                onChange={(e) => setSettings(s => ({ ...s, deliveryFee: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Minimum Order (Rs.)</label>
              <input
                type="number"
                value={settings.minOrderAmount}
                onChange={(e) => setSettings(s => ({ ...s, minOrderAmount: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Time Estimates */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Time Estimates</h2>
            <p className="text-sm text-muted-foreground">Set estimated preparation and delivery times</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Delivery Time (minutes)</label>
            <input
              type="text"
              value={settings.estimatedDeliveryTime}
              onChange={(e) => setSettings(s => ({ ...s, estimatedDeliveryTime: e.target.value }))}
              placeholder="e.g. 35-45"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Pickup Time (minutes)</label>
            <input
              type="text"
              value={settings.estimatedPickupTime}
              onChange={(e) => setSettings(s => ({ ...s, estimatedPickupTime: e.target.value }))}
              placeholder="e.g. 15-20"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
            />
          </div>
        </div>
      </div>

      {/* Order Settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold text-foreground">Order Settings</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Accept Orders</p>
              <p className="text-sm text-muted-foreground">Enable or disable order acceptance</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, isAcceptingOrders: !s.isAcceptingOrders }))}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.isAcceptingOrders ? 'bg-green-500' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  settings.isAcceptingOrders ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Delivery Enabled</p>
              <p className="text-sm text-muted-foreground">Allow delivery orders</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, isDeliveryEnabled: !s.isDeliveryEnabled }))}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.isDeliveryEnabled ? 'bg-green-500' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  settings.isDeliveryEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
          <label className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Pickup Enabled</p>
              <p className="text-sm text-muted-foreground">Allow pickup orders</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, isPickupEnabled: !s.isPickupEnabled }))}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.isPickupEnabled ? 'bg-green-500' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  settings.isPickupEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Coupon Settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <TicketPercent className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Coupons</h2>
            <p className="text-sm text-muted-foreground">Only active coupons here will be valid on checkout</p>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <input
            type="text"
            value={newCoupon.code}
            onChange={(e) => setNewCoupon((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder="Code (e.g. SAVE10)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          />
          <select
            value={newCoupon.type}
            onChange={(e) => setNewCoupon((prev) => ({ ...prev, type: e.target.value as CouponType }))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          >
            <option value="percentage">Percentage %</option>
            <option value="fixed">Fixed Rs.</option>
          </select>
          <input
            type="number"
            value={newCoupon.value}
            min={1}
            onChange={(e) => setNewCoupon((prev) => ({ ...prev, value: parseInt(e.target.value) || 0 }))}
            placeholder="Value"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
          />
          <button
            onClick={addCoupon}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-brand-red/90"
          >
            <Plus className="h-4 w-4" />
            Add Coupon
          </button>
        </div>

        <div className="space-y-2">
          {settings.coupons.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
              No coupons configured yet.
            </p>
          ) : (
            settings.coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                    {coupon.code}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {coupon.type === 'percentage' ? `${coupon.value}% off` : `Rs. ${coupon.value} off`}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      coupon.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {coupon.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCoupon(coupon.id)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    {coupon.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => removeCoupon(coupon.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-brand-red px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-red/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
