"use client"

import * as React from "react"

/** 原生键盘高度(px)。Web 端恒为 0;keyboardWillShow/Hide 在动画开始前触发,便于同步过渡 */
export function useKeyboardHeight() {
  const [height, setHeight] = React.useState(0)

  React.useEffect(() => {
    let showHandle: { remove: () => void } | undefined
    let hideHandle: { remove: () => void } | undefined

    import("@capacitor/keyboard")
      .then(({ Keyboard }) => {
        Keyboard.addListener("keyboardWillShow", (info) => {
          setHeight(info.keyboardHeight)
        }).then((h) => { showHandle = h })
        Keyboard.addListener("keyboardWillHide", () => {
          setHeight(0)
        }).then((h) => { hideHandle = h })
      })
      .catch(() => {})

    return () => {
      showHandle?.remove()
      hideHandle?.remove()
    }
  }, [])

  return height
}
