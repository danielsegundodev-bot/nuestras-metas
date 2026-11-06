import { describe, expect, it } from 'vitest'
import { isIOS, isIOSSafari, isStandalone } from './platform'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1'
const IPHONE_INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0'
const IPHONE_WEBVIEW =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'

describe('isStandalone', () => {
  it('detects display-mode and navigator.standalone', () => {
    expect(isStandalone({ userAgent: '', displayModeStandalone: true })).toBe(true)
    expect(isStandalone({ userAgent: '', navigatorStandalone: true })).toBe(true)
  })
  it('is false in a normal tab', () => {
    expect(
      isStandalone({ userAgent: '', displayModeStandalone: false, navigatorStandalone: false }),
    ).toBe(false)
    expect(isStandalone({ userAgent: '' })).toBe(false)
  })
})

describe('isIOS', () => {
  it('matches iPhone and iPad UAs', () => {
    expect(isIOS({ userAgent: IPHONE_SAFARI })).toBe(true)
    expect(isIOS({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)' })).toBe(true)
  })
  it('matches iPadOS posing as a Mac, but not a real Mac', () => {
    expect(isIOS({ userAgent: MAC_SAFARI, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true)
    expect(isIOS({ userAgent: MAC_SAFARI, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false)
  })
  it('is false on Android', () => {
    expect(isIOS({ userAgent: ANDROID_CHROME })).toBe(false)
  })
})

describe('isIOSSafari', () => {
  it('is true for Safari on iPhone', () => {
    expect(isIOSSafari({ userAgent: IPHONE_SAFARI })).toBe(true)
  })
  it('is false for Chrome iOS and in-app browsers', () => {
    expect(isIOSSafari({ userAgent: IPHONE_CHROME })).toBe(false)
    expect(isIOSSafari({ userAgent: IPHONE_INSTAGRAM })).toBe(false)
    expect(isIOSSafari({ userAgent: IPHONE_WEBVIEW })).toBe(false)
  })
  it('is false off iOS', () => {
    expect(isIOSSafari({ userAgent: ANDROID_CHROME })).toBe(false)
    expect(isIOSSafari({ userAgent: MAC_SAFARI })).toBe(false)
  })
})
