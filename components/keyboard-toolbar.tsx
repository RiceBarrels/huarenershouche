"use client"

import * as React from "react"
import { Smile, Hash } from "lucide-react"
import { useKeyboardHeight } from "@/hooks/use-keyboard-height"

// 常用表情(横向滚动一排,点按插入)
const EMOJIS = [
  "😀", "😂", "🤣", "😍", "🥰", "😎", "🤔", "😅", "😭", "🙏",
  "👍", "🔥", "💯", "🎉", "❤️", "✨", "💰", "🚗", "🛞", "🔧",
]

/**
 * 键盘工具条(小红书风格):原生键盘弹起时吸附在键盘上方,
 * 随键盘动画同步滑入;表情/# 插入到当前聚焦的输入框,「完成」收起键盘。
 * Web 端键盘高度恒为 0,不渲染任何可见内容。
 */
export function KeyboardToolbar() {
  const kbHeight = useKeyboardHeight()
  const [emojiOpen, setEmojiOpen] = React.useState(false)
  const open = kbHeight > 0

  // 键盘收起时顺带收起表情面板
  React.useEffect(() => {
    if (!open) setEmojiOpen(false)
  }, [open])

  // 插入文本到当前聚焦的 input/textarea 光标处。
  // execCommand 走原生 input 事件,React 受控组件能正常同步;失效时手动派发
  function insert(text: string) {
    const el = document.activeElement
    if (
      !(el instanceof HTMLInputElement) &&
      !(el instanceof HTMLTextAreaElement)
    )
      return
    if (document.execCommand("insertText", false, text)) return
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const proto = Object.getPrototypeOf(el)
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
    setter?.call(el, el.value.slice(0, start) + text + el.value.slice(end))
    el.dispatchEvent(new Event("input", { bubbles: true }))
    el.setSelectionRange(start + text.length, start + text.length)
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
      style={{
        transform: open ? `translateY(-${kbHeight}px)` : "translateY(100%)",
      }}
      // 按下不夺焦点,避免点工具条导致输入框失焦、键盘收起
      onPointerDown={(e) => e.preventDefault()}
    >
      {emojiOpen && (
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 scrollbar-none">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="shrink-0 px-1.5 text-[22px] leading-none active:opacity-60"
              onClick={() => insert(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <div className="flex h-11 items-center gap-1 px-2">
        <button
          type="button"
          aria-label="表情"
          onClick={() => setEmojiOpen((v) => !v)}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            emojiOpen ? "bg-muted text-foreground" : "text-foreground"
          }`}
        >
          <Smile className="h-[22px] w-[22px]" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          aria-label="插入话题"
          onClick={() => insert("#")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground"
        >
          <Hash className="h-[22px] w-[22px]" strokeWidth={1.5} />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => {
            const el = document.activeElement
            if (el instanceof HTMLElement) el.blur()
          }}
          className="px-3 text-[15px] font-medium text-foreground active:opacity-60"
        >
          完成
        </button>
      </div>
    </div>
  )
}
