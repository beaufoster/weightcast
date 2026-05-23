import posthog from 'posthog-js'

const PH_KEY = 'phc_uANfyidyehw2qkveadqRKqyoJQheqT3Vo5r8iEKxTRvc'

export const IS_TEST  = new URLSearchParams(window.location.search).get('env') === 'test'
export const IS_OWNER = !!localStorage.getItem('trimly_owner_mode')

const devParam = new URLSearchParams(window.location.search).get('dev')
if (devParam === 'owner') localStorage.setItem('trimly_owner_mode', '1')
if (devParam === 'off')   localStorage.removeItem('trimly_owner_mode')

const suppressed = IS_TEST || IS_OWNER

if (!suppressed) {
  try {
    posthog.init(PH_KEY, {
      api_host: 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_performance: true,
    })
  } catch (_) {}
}

let _deviceId = localStorage.getItem('trimly_device_id')
if (!_deviceId) {
  _deviceId = 'dev_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
  localStorage.setItem('trimly_device_id', _deviceId)
}
export const deviceId = _deviceId

if (!suppressed) {
  try { posthog.identify(_deviceId) } catch (_) {}
}

export const ph = {
  identify(id: string, props?: Record<string, string>) {
    if (suppressed) return
    try { posthog.identify(id, props) } catch (_) {}
  },
  capture(event: string, props: Record<string, unknown> = {}) {
    if (suppressed) {
      console.log('[Analytics suppressed]', event, props)
      return
    }
    try { posthog.capture(event, { ...props, env: 'production' }) } catch (_) {}
  },
  reset() {
    if (suppressed) return
    try { posthog.reset() } catch (_) {}
  },
}
