/**
 * Utility to sync localStorage changes across tabs and trigger UI updates
 * Manually fires storage events since storage events don't fire in the same tab
 */

export function setStorageWithSync(key: string, value: string) {
  const oldValue = localStorage.getItem(key)
  localStorage.setItem(key, value)
  
  // Manually trigger storage event for same-tab synchronization
  const event = new StorageEvent('storage', {
    key,
    newValue: value,
    oldValue,
    storageArea: localStorage,
  })
  
  window.dispatchEvent(event)
}

export function getStorage(key: string): string | null {
  return localStorage.getItem(key)
}

export function removeStorageWithSync(key: string) {
  const oldValue = localStorage.getItem(key)
  localStorage.removeItem(key)
  
  const event = new StorageEvent('storage', {
    key,
    newValue: null,
    oldValue,
    storageArea: localStorage,
  })
  
  window.dispatchEvent(event)
}
