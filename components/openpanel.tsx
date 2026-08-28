"use client";

import { useEffect } from "react";
import { OpenPanelComponent, useOpenPanel } from "@openpanel/nextjs";
import { useIdentity } from "@/components/identity-provider";

const CLIENT_ID = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID;

// 登录后把 Supabase 用户绑定到 OpenPanel profile,登出时清除
function OpenPanelIdentify() {
  const op = useOpenPanel();
  const { authUser, actingProfile } = useIdentity();

  useEffect(() => {
    if (authUser) {
      op.identify({
        profileId: authUser.id,
        email: authUser.email,
        firstName: actingProfile?.username,
        properties: {
          account_type: actingProfile?.account_type,
        },
      });
    } else {
      op.clear();
    }
  }, [op, authUser, actingProfile]);

  return null;
}

export function OpenPanelAnalytics() {
  if (!CLIENT_ID) return null;
  return (
    <>
      <OpenPanelComponent
        clientId={CLIENT_ID}
        trackScreenViews
        trackOutgoingLinks
      />
      <OpenPanelIdentify />
    </>
  );
}
