'use client'

export type WebNotificationPreferences = {
  liveUpdates: boolean
  soundAlerts: boolean
  browserAlerts: boolean
}

export const DEFAULT_WEB_NOTIFICATION_PREFERENCES: WebNotificationPreferences = {
  liveUpdates: true,
  soundAlerts: false,
  browserAlerts: false,
}

const NOTIFICATION_PREFERENCES_STORAGE_KEY = 'itrack.webNotificationPreferences'
const NOTIFICATION_PREFERENCES_EVENT = 'itrack:web-notification-preferences'
const NOTIFICATION_REFRESH_EVENT = 'itrack:web-notifications-refresh'

const isClient = () => typeof window !== 'undefined'

const safeParsePreferences = (rawValue: string | null): WebNotificationPreferences | null => {
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<WebNotificationPreferences>

    return {
      liveUpdates: parsed.liveUpdates ?? DEFAULT_WEB_NOTIFICATION_PREFERENCES.liveUpdates,
      soundAlerts: parsed.soundAlerts ?? DEFAULT_WEB_NOTIFICATION_PREFERENCES.soundAlerts,
      browserAlerts: parsed.browserAlerts ?? DEFAULT_WEB_NOTIFICATION_PREFERENCES.browserAlerts,
    }
  } catch {
    return null
  }
}

export const browserNotificationsSupported = () =>
  isClient() && 'Notification' in window

export const getBrowserNotificationPermission = () => {
  if (!browserNotificationsSupported()) {
    return 'unsupported' as const
  }

  return Notification.permission
}

export const loadWebNotificationPreferences = (): WebNotificationPreferences => {
  if (!isClient()) {
    return DEFAULT_WEB_NOTIFICATION_PREFERENCES
  }

  return (
    safeParsePreferences(
      window.localStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY)
    ) ?? DEFAULT_WEB_NOTIFICATION_PREFERENCES
  )
}

export const saveWebNotificationPreferences = (
  preferences: WebNotificationPreferences
) => {
  if (!isClient()) {
    return preferences
  }

  window.localStorage.setItem(
    NOTIFICATION_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences)
  )
  window.dispatchEvent(
    new CustomEvent<WebNotificationPreferences>(NOTIFICATION_PREFERENCES_EVENT, {
      detail: preferences,
    })
  )

  return preferences
}

export const subscribeWebNotificationPreferences = (
  listener: (preferences: WebNotificationPreferences) => void
) => {
  if (!isClient()) {
    return () => undefined
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== NOTIFICATION_PREFERENCES_STORAGE_KEY) {
      return
    }

    listener(loadWebNotificationPreferences())
  }

  const handleCustomEvent = (event: Event) => {
    const nextPreferences = (event as CustomEvent<WebNotificationPreferences>).detail
    listener(nextPreferences ?? loadWebNotificationPreferences())
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(NOTIFICATION_PREFERENCES_EVENT, handleCustomEvent)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(NOTIFICATION_PREFERENCES_EVENT, handleCustomEvent)
  }
}

export const requestWebNotificationRefresh = () => {
  if (!isClient()) {
    return
  }

  window.dispatchEvent(new Event(NOTIFICATION_REFRESH_EVENT))
}

export const subscribeWebNotificationRefresh = (listener: () => void) => {
  if (!isClient()) {
    return () => undefined
  }

  window.addEventListener(NOTIFICATION_REFRESH_EVENT, listener)

  return () => {
    window.removeEventListener(NOTIFICATION_REFRESH_EVENT, listener)
  }
}
