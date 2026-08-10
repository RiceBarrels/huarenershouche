// 轻触觉反馈:原生走 Capacitor Haptics,web 退回 navigator.vibrate
export function triggerHaptic() {
  import("@capacitor/haptics")
    .then(({ Haptics, ImpactStyle }) =>
      Haptics.impact({ style: ImpactStyle.Light })
    )
    .catch(() => {
      navigator?.vibrate?.(8);
    });
}
