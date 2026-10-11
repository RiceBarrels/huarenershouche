"use client";

// 取名输入框的状态:等 IP 定位回来后自动填入一个随机用户名(只填一次,
// 用户已输入则不覆盖),reroll() 换一个。生成规则见 lib/username。

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useI18n } from "@/components/i18n-provider";
import { getIpGeo, type IpGeo } from "@/lib/ip-geo";
import { generateUsername, hintsFromUser } from "@/lib/username";

export function useRandomUsername(user?: User | null, enabled = true) {
  const { locale } = useI18n();
  const [username, setUsername] = useState("");
  // null = 定位中或失败(照样生成,只是没有地区词)
  const [geo, setGeo] = useState<IpGeo | null>(null);
  const prefilled = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    getIpGeo().then((g) => {
      if (!alive) return;
      setGeo(g);
      if (prefilled.current) return;
      prefilled.current = true;
      setUsername((cur) => cur || generateUsername({ locale, geo: g, ...hintsFromUser(user) }));
    });
    return () => {
      alive = false;
    };
  }, [enabled, locale, user]);

  const generate = useCallback(
    () => generateUsername({ locale, geo, ...hintsFromUser(user) }),
    [locale, geo, user],
  );

  const reroll = useCallback(() => setUsername(generate()), [generate]);

  return { username, setUsername, reroll };
}
