import { OpenPanel } from "@openpanel/nextjs";

// 服务端埋点实例(cron / route handler 用);clientSecret 仅存在于服务端环境变量
export const op = new OpenPanel({
  clientId: process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!,
  clientSecret: process.env.OPENPANEL_CLIENT_SECRET!,
});
