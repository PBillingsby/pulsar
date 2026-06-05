export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export interface DeviceInfo {
  deviceType: DeviceType
  browser: string
  os: string
  screenWidth: number
  screenHeight: number
}

export function getDeviceInfo(): DeviceInfo {
  const ua: string = navigator.userAgent

  const deviceType: DeviceType = /Mobi|Android|iPhone|iPod/i.test(ua)
    ? 'mobile'
    : /iPad|Tablet/i.test(ua)
      ? 'tablet'
      : 'desktop'

  const browser: string =
    /Edg\//i.test(ua) ? 'Edge' :
      /OPR\//i.test(ua) ? 'Opera' :
        /Chrome\//i.test(ua) ? 'Chrome' :
          /Safari\//i.test(ua) ? 'Safari' :
            /Firefox\//i.test(ua) ? 'Firefox' :
              'Other'

  const os: string =
    /Windows/i.test(ua) ? 'Windows' :
      /Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua) ? 'macOS' :
        /iPhone/i.test(ua) ? 'iOS' :
          /iPad/i.test(ua) ? 'iPadOS' :
            /Android/i.test(ua) ? 'Android' :
              /Linux/i.test(ua) ? 'Linux' :
                'Other'

  return {
    deviceType,
    browser,
    os,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  }
}