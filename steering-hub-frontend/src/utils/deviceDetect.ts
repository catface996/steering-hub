/**
 * 检测当前设备是否为手机（基于 User Agent）
 * 手机端 → 返回 true；PC / 桌面浏览器 → 返回 false
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/** React Hook 版本，直接在组件中使用 */
export function useIsMobile(): boolean {
  return isMobileDevice();
}
