import { IS_TEST } from './analytics'

export const STORE = IS_TEST ? 'trimly_test_' : 'tr_'

export const keys = {
  unit:              STORE + 'unit',
  page:              STORE + 'page',
  name:              STORE + 'name',
  form:              STORE + 'form',
  celebrated:        STORE + 'celebrated',
  syncNudgeDismissed: STORE + 'sync_nudge_dismissed',
  deviceId:          'trimly_device_id',
  ownerMode:         'trimly_owner_mode',
  cookieConsent:     'trimly_cookie_consent',
} as const
