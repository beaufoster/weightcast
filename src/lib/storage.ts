import { IS_TEST } from './analytics'

export const STORE = IS_TEST ? 'trimly_test_' : 'tr_'

export const keys = {
  unit:              STORE + 'unit',
  page:              STORE + 'page',
  name:              STORE + 'name',
  form:              STORE + 'form',
  celebrated:        STORE + 'celebrated',
  syncNudgeDismissed: STORE + 'sync_nudge_dismissed',
  deviceId:          'weightcast_device_id',
  ownerMode:         'weightcast_owner_mode',
  cookieConsent:     'weightcast_cookie_consent',
} as const
