"use client";

// 偏好三问(界面密度 / 居住地 / 计划持有年限),/account/setup 页、取名后的可选第二步(App)和网页 onboarding 末页共用。
// 居住地 / 持有年限都有「还没想好」(= 不回答),不回答时界面保持默认。
// 每个选择立即写入 clc_prefs(usePreferences),全站即时生效;选项变化上报 setup_answer(不含邮编)。
// 居住地只存在本机,不写 profiles、不公开展示。

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SettingsGroup, GroupHeader, GroupFooter, SegmentedControl } from "@/components/ios-settings";
import { useI18n } from "@/components/i18n-provider";
import { usePreferences } from "@/components/use-preferences";
import { trackSetupAnswer } from "@/lib/analytics/client";
import { triggerHaptic } from "@/lib/haptics";
import {
  OWNERSHIP_LABELS,
  OWNERSHIP_LENGTHS,
  PREF_COUNTRIES,
  PREF_COUNTRY_LABELS,
  UI_DENSITIES,
  UI_DENSITY_LABELS,
  type OwnershipLength,
  type PrefCountry,
  type UiDensity,
} from "@/lib/preferences";
import { isPostalCodeFor, normalizePostalCode, postalInputMaxLength, sanitizePostalInput } from "@/lib/postal";
import { cn } from "@/lib/utils";

/** 「还没想好」:不回答这一题(偏好里删掉该项,各处按原有默认逻辑) */
const UNSURE = "unsure" as const;

/** 一组可选按钮(单选,两列网格);用于选项较多、分段控件放不下的题 */
function OptionGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (active) return;
              triggerHaptic();
              onChange(opt.value);
            }}
            className={cn(
              "rounded-[0.3rem] border px-3 py-2.5 text-left font-mono text-[13px] transition-colors",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground active:opacity-60"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function PreferencesForm({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const { prefs, update } = usePreferences();
  // 邮编草稿:格式对得上所选国家才写进偏好,清空则删掉
  const [postalDraft, setPostalDraft] = useState(prefs.postal ?? "");
  // 水合后 / 其他标签页改了邮编:同步进草稿(渲染期调整 state,避免多一次 effect)
  const [seenPostal, setSeenPostal] = useState(prefs.postal);
  if (prefs.postal !== seenPostal) {
    setSeenPostal(prefs.postal);
    if (prefs.postal) setPostalDraft(prefs.postal);
  }
  const country = prefs.country;
  const postalCountry = country && country !== "other" ? country : null;
  const postalInvalid = !!postalCountry && !!postalDraft.trim() && !isPostalCodeFor(postalDraft, postalCountry);

  function setUi(ui: UiDensity) {
    update({ ui });
    trackSetupAnswer(`ui:${ui}`, locale);
  }

  function setCountry(c: PrefCountry | typeof UNSURE) {
    if (c === UNSURE) {
      update({ country: undefined, postal: undefined });
      setPostalDraft("");
      trackSetupAnswer("country:unsure", locale);
      return;
    }
    const keep = c !== "other" && isPostalCodeFor(postalDraft, c);
    update({ country: c, postal: keep ? normalizePostalCode(postalDraft) : undefined });
    if (!keep) setPostalDraft("");
    trackSetupAnswer(`country:${c}`, locale);
  }

  function setPostal(raw: string) {
    const { value } = sanitizePostalInput(raw);
    setPostalDraft(value);
    if (!postalCountry) return;
    if (!value.trim()) update({ postal: undefined });
    else if (isPostalCodeFor(value, postalCountry)) update({ postal: normalizePostalCode(value) });
  }

  function setOwnership(o: OwnershipLength | typeof UNSURE) {
    if (o === UNSURE) {
      update({ ownership: undefined });
      trackSetupAnswer("own:unsure", locale);
      return;
    }
    update({ ownership: o });
    trackSetupAnswer(`own:${o}`, locale);
  }

  return (
    <div className={className}>
      <GroupHeader>{t("车源卡片显示")}</GroupHeader>
      <SettingsGroup className="p-2">
        <SegmentedControl
          options={UI_DENSITIES.map((v) => ({ value: v, label: t(UI_DENSITY_LABELS[v]) }))}
          value={prefs.ui}
          onChange={setUi}
        />
      </SettingsGroup>
      <GroupFooter>
        {prefs.ui === "simple"
          ? t("只显示图片、标题、价格、里程和所在地,筛选默认收起。")
          : t("额外显示驱动、燃油、卖家语言和价格参考,筛选默认展开。")}
      </GroupFooter>

      <GroupHeader>{t("你住在哪里?")}</GroupHeader>
      <SettingsGroup className="space-y-3 p-3">
        <OptionGrid
          options={[
            ...PREF_COUNTRIES.map((v) => ({ value: v as PrefCountry | typeof UNSURE, label: t(PREF_COUNTRY_LABELS[v]) })),
            { value: UNSURE, label: t("还没想好") },
          ]}
          value={country ?? UNSURE}
          onChange={setCountry}
        />
        {postalCountry && (
          <div>
            {/* text-base=16px,避免 iOS 聚焦自动放大 */}
            <Input
              inputMode={postalCountry === "CA" ? "text" : "numeric"}
              autoComplete="postal-code"
              placeholder={t("邮编(选填)")}
              aria-label={t("邮编")}
              className="h-11 font-mono text-base"
              maxLength={postalInputMaxLength(postalCountry, postalDraft)}
              value={postalDraft}
              onChange={(e) => setPostal(e.target.value)}
            />
            {postalInvalid && (
              <p className="mt-1.5 px-1 font-mono text-xs text-destructive">{t("邮编格式不正确")}</p>
            )}
          </div>
        )}
      </SettingsGroup>
      <GroupFooter>{t("用于默认货币、里程单位和距离筛选的起点。只保存在本设备,不会公开。")}</GroupFooter>

      <GroupHeader>{t("买到车后打算开多久?")}</GroupHeader>
      <SettingsGroup className="p-3">
        <OptionGrid
          options={[
            ...OWNERSHIP_LENGTHS.map((v) => ({ value: v as OwnershipLength | typeof UNSURE, label: t(OWNERSHIP_LABELS[v]) })),
            { value: UNSURE, label: t("还没想好") },
          ]}
          value={prefs.ownership ?? UNSURE}
          onChange={setOwnership}
        />
      </SettingsGroup>
      <GroupFooter>{t("用于调整首页推荐:短期侧重价格和保值,长期侧重低里程和较新年份。")}</GroupFooter>
    </div>
  );
}
