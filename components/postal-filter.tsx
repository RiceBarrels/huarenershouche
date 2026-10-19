"use client";

// 位置筛选的「国家 + 邮编」输入(/browse 桌面筛选面板、手机筛选抽屉、首页地区抽屉共用)。
// 先选国家再填邮编:美国 5 位 zip、加拿大 A1A 1A1、澳大利亚 / 新西兰 4 位(两国格式相同,靠国家区分)。
// 只有完整、且符合所选国家格式的邮编才写进筛选(location);4 位邮编同时写 country,
// 美国 / 加拿大按格式就能定国家,country 留空(URL 保持 ?location=90210)。
// 国家默认:筛选里已有邮编 → 它的国家;否则访客 IP 国家(/api/geo,四国之一);再否则美国。

import { useEffect, useRef, useState } from "react";
import { getIpGeo } from "@/lib/ip-geo";
import {
  COUNTRY_LABELS,
  isAmbiguousPostalCode,
  isCountry,
  isPostalCode,
  isPostalCodeFor,
  normalizePostalCode,
  postalFromFilter,
  postalInputMaxLength,
  sanitizePostalInput,
  type Country,
} from "@/lib/postal";

type TFn = (text: string, vars?: Record<string, string | number>) => string;

export interface PostalPatch {
  location: string;
  country: string;
}

/** 筛选标签 / 摘要:美国「Zip 90210」,其他「2000 · 澳大利亚」;不是邮编原样返回(城市名) */
export function postalLocationLabel(location: string, country: string, t: TFn): string {
  const p = postalFromFilter(location, country);
  if (!p) return location;
  return p.country === "US" ? `Zip ${p.code}` : `${p.code} · ${t(COUNTRY_LABELS[p.country])}`;
}

/** 位置区块下方的说明:按哪个邮编算距离 */
export function postalHint(location: string, country: string, t: TFn): string | null {
  const p = postalFromFilter(location, country);
  if (!p) return null;
  return p.country === "US"
    ? t("以 Zip {zip} 为中心按距离筛选", { zip: p.code })
    : t("以{country}邮编 {zip} 为中心按距离筛选", { country: t(COUNTRY_LABELS[p.country]), zip: p.code });
}

export function usePostalFilterInput(location: string, country: string, onPatch: (patch: PostalPatch) => void) {
  const initial = postalFromFilter(location, country);
  const [zip, setZip] = useState(initial?.code ?? "");
  const [zipCountry, setZipCountry] = useState<Country>(initial?.country ?? "US");
  // 用户动过国家 / 邮编(或筛选里本来就有邮编)后不再用 IP 国家覆盖
  const touched = useRef(!!initial);

  // 外部改了筛选(URL / 清空 / 另一个面板):同步到输入框;输入中的不完整值保留
  useEffect(() => {
    const p = postalFromFilter(location, country);
    if (p) {
      touched.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 父组件(URL/清空)改了筛选条件时同步到本地状态
      setZip(p.code);
      setZipCountry(p.country);
    } else if (!location) {
      setZip((z) => (isPostalCode(z) ? "" : z));
    }
  }, [location, country]);

  // IP 国家只决定默认选中哪个国家,不写筛选
  useEffect(() => {
    if (touched.current) return;
    let cancelled = false;
    getIpGeo().then((geo) => {
      const c = geo?.country;
      if (!cancelled && !touched.current && isCountry(c)) setZipCountry(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function apply(nextZip: string, nextCountry: Country) {
    if (isPostalCodeFor(nextZip, nextCountry)) {
      const code = normalizePostalCode(nextZip);
      onPatch({ location: code, country: isAmbiguousPostalCode(code) ? nextCountry : "" });
    } else if (location || country) {
      onPatch({ location: "", country: "" });
    }
  }

  function onZipChange(raw: string) {
    touched.current = true;
    const { value: next, letters } = sanitizePostalInput(raw);
    let c = zipCountry;
    // 字母开头只可能是加拿大邮编;5 位数字只可能是美国 zip(加拿大 / 澳 / 新模式下直接输数字、粘贴 zip)。
    // 澳 / 新模式也放到 5 位,不能先截成 4 位 —— 否则「90210」会悄悄变成合法的澳 / 新邮编「9021」
    if (letters) c = "CA";
    else if (next.length === 5) c = "US";
    setZip(next);
    setZipCountry(c);
    apply(next, c);
  }

  function onCountryChange(c: Country) {
    touched.current = true;
    setZipCountry(c);
    if (isPostalCodeFor(zip, c)) {
      apply(zip, c);
    } else {
      setZip("");
      if (isPostalCode(location) || country) onPatch({ location: "", country: "" });
    }
  }

  function clear() {
    setZip("");
    onPatch({ location: "", country: "" });
  }

  const textMode = zipCountry === "CA" || /^[A-Za-z]/.test(zip);
  return {
    zip,
    country: zipCountry,
    onZipChange,
    onCountryChange,
    clear,
    inputMode: (textMode ? "text" : "numeric") as "text" | "numeric",
    maxLength: postalInputMaxLength(zipCountry, zip),
    /** 非美国时的示例占位符(美国沿用各处原有的「输入 Zipcode」文案) */
    examplePlaceholder: zipCountry === "CA" ? "A1A 1A1" : zipCountry === "AU" ? "2000" : zipCountry === "NZ" ? "1010" : null,
  };
}
