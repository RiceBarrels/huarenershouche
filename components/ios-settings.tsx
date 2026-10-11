"use client";

// iOS 26 账户区共享组件:
// SettingsGroup 白色分组卡 / SettingsRow 设置行(彩色线条图标 + 标题 +
// 右侧值 + chevron)/ GroupFooter 分组脚注 / LargeTitle 大标题 /
// IOSSwitch 绿色开关 / SegmentedControl 分段控件。
// 圆角规范:卡 26px 超椭圆;行内嵌套元素同心圆角(外 26 − 边距);
// 控件一律胶囊形。

import Link from "@/components/localized-navigation";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

/* 白色分组卡。iOS 26 圆角规律:多行分组卡 26px 大圆角;只有一行的
   分组卡整颗胶囊(如 iOS 设置里的 Apps / Developer / 搜索框),
   单行时由调用方传 capsule */
export function SettingsGroup({ children, className = "", capsule = false }: {
  children: React.ReactNode;
  className?: string;
  capsule?: boolean;
}) {
  return (
    <div className={`overflow-hidden bg-card ${capsule ? "rounded-full" : "rounded-[26px]"} ${className}`}>
      {children}
    </div>
  );
}

/* 分组标题(iOS 卡片上方灰色小字,与卡内文字对齐) */
export function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-6 px-5 font-mono text-xs font-medium text-muted-foreground">{children}</h2>
  );
}

/* 分组脚注(iOS 灰色小字,与卡内文字对齐) */
export function GroupFooter({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 px-5 font-mono text-xs leading-relaxed text-muted-foreground">{children}</p>
  );
}

/* iOS 大标题 */
export function LargeTitle({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between px-1">
      <div>
        <h1 className="font-mono text-[28px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 font-mono text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {trailing}
    </div>
  );
}

/* iOS 设置行:彩色线条图标(无底色)+ 标题 + 右侧值 + chevron。
   分隔线从文字起始处缩进,末行无线。external:href 为站外链接 / mailto,
   用原生 <a>(不补语言前缀),尾部换成 ↗ */
export function SettingsRow({
  icon, label, value, href, external, onClick, destructive, trailing, disabled,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | React.ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  destructive?: boolean;
  trailing?: React.ReactNode;
  disabled?: boolean;
}) {
  const interactive = !!href || !!onClick;
  const cls = `group/row flex w-full items-center gap-3 pl-4 text-left transition-colors ${interactive ? "active:bg-muted/60" : ""} ${destructive ? "text-destructive" : ""} ${disabled ? "opacity-50" : ""}`;
  const inner = (
    <>
      {icon && <span className="flex h-6 w-6 shrink-0 items-center justify-center">{icon}</span>}
      {/* 行高 ≥56px:单行卡高度必须超过上下圆角之和(26×2=52px),
          否则 CSS 会等比压缩圆角,单行卡会变成胶囊、和多行卡不一致 */}
      <span className="flex min-h-[56px] min-w-0 flex-1 items-center gap-2 border-b border-border/50 py-2 mr-4 group-last/row:border-0">
        <span className="min-w-0 flex-1 truncate font-mono text-[15px]">{label}</span>
        {value && (
          <span className="max-w-[45%] shrink-0 truncate font-mono text-sm tabular-nums text-muted-foreground">{value}</span>
        )}
        {trailing ?? (interactive && (external
          ? <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={2} />
          : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={2} />))}
      </span>
    </>
  );
  if (href && !disabled && external) {
    // 原生壳里 http(s) 外链由 CapacitorProvider 统一拦截走系统打开
    const blank = /^https?:\/\//i.test(href);
    return (
      <a href={href} target={blank ? "_blank" : undefined} rel={blank ? "noopener noreferrer" : undefined} className={cls}>
        {inner}
      </a>
    );
  }
  if (href && !disabled) return <Link href={href} className={cls}>{inner}</Link>;
  if (interactive) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

/* iOS 式表单行:label 固定列 + 无边框输入,分隔线从 label 起始缩进 */
export function FieldRow({
  label, value, placeholder, onChange, id, type = "text", required, maxLength, inputMode, inputClassName = "",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  id?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  inputClassName?: string;
}) {
  return (
    <label htmlFor={id} className="group/row flex items-center pl-4">
      <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-border/60 pr-4 group-last/row:border-0">
        <span className="w-20 shrink-0 font-mono text-[15px]">{label}</span>
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          className={`h-12 min-w-0 flex-1 bg-transparent font-mono text-[15px] outline-none placeholder:text-muted-foreground/50 ${inputClassName}`}
        />
      </span>
    </label>
  );
}

/* iOS 绿色开关(51×31 比例缩至 48×28,胶囊 + 白色滑块) */
export function IOSSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => { triggerHaptic(); onChange(!checked); }}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-brand" : "bg-muted-foreground/25"} ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

/* iOS 分段控件:灰底胶囊容器 + 白色滑块 */
export function SegmentedControl<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-muted p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => { if (!active) { triggerHaptic(); onChange(opt.value); } }}
            className={`flex-1 rounded-full py-1.5 font-mono text-[13px] transition-all duration-200 ${
              active
                ? "bg-card font-semibold text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                : "text-muted-foreground active:opacity-60"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
