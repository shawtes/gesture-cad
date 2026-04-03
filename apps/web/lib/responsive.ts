/**
 * Responsive UI utilities for mobile/tablet support.
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

export function detectDevice(): DeviceInfo {
  if (typeof window === "undefined") {
    return { isMobile: false, isTablet: false, isDesktop: true, isTouchDevice: false, screenWidth: 1920, screenHeight: 1080, pixelRatio: 1 };
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isMobile = w < 768;
  const isTablet = w >= 768 && w < 1024;
  const isDesktop = w >= 1024;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    screenWidth: w,
    screenHeight: h,
    pixelRatio: window.devicePixelRatio || 1,
  };
}

/** Get responsive layout config based on device */
export function getResponsiveLayout(device: DeviceInfo): {
  sidebarWidth: number;
  toolbarHeight: number;
  showFeatureTree: boolean;
  showWorkbenchSidebar: boolean;
  compactToolbar: boolean;
  touchTargetSize: number;
} {
  if (device.isMobile) {
    return {
      sidebarWidth: 0,
      toolbarHeight: 48,
      showFeatureTree: false,
      showWorkbenchSidebar: false,
      compactToolbar: true,
      touchTargetSize: 44,
    };
  }
  if (device.isTablet) {
    return {
      sidebarWidth: 200,
      toolbarHeight: 80,
      showFeatureTree: true,
      showWorkbenchSidebar: false,
      compactToolbar: true,
      touchTargetSize: 40,
    };
  }
  return {
    sidebarWidth: 280,
    toolbarHeight: 120,
    showFeatureTree: true,
    showWorkbenchSidebar: true,
    compactToolbar: false,
    touchTargetSize: 36,
  };
}

/** Touch gesture helper: detect pinch zoom */
export function detectPinchZoom(
  touches: TouchList
): { distance: number; center: { x: number; y: number } } | null {
  if (touches.length < 2) return null;
  const t1 = touches[0];
  const t2 = touches[1];
  const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  const center = {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
  return { distance, center };
}

/** Touch gesture helper: detect two-finger pan */
export function detectTwoFingerPan(
  prevTouches: { x: number; y: number }[],
  currentTouches: TouchList
): { dx: number; dy: number } | null {
  if (currentTouches.length < 2 || prevTouches.length < 2) return null;
  const prevCenter = {
    x: (prevTouches[0].x + prevTouches[1].x) / 2,
    y: (prevTouches[0].y + prevTouches[1].y) / 2,
  };
  const currCenter = {
    x: (currentTouches[0].clientX + currentTouches[1].clientX) / 2,
    y: (currentTouches[0].clientY + currentTouches[1].clientY) / 2,
  };
  return {
    dx: currCenter.x - prevCenter.x,
    dy: currCenter.y - prevCenter.y,
  };
}
