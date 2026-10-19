# 邮件主题行

粘贴到 Supabase Dashboard → Authentication → Email Templates 对应模板的 Subject。主题行不带验证码(锁屏、通知预览会被旁人看到)。
正文按 `{{ .Data.locale }}` 分 zh / zh-hant / en 三种,其余语言和没有 locale 的老账号走中英双语兜底;主题行是否支持条件语法未核实,所以先固定用双语。

| 模板 | 文件 | Subject |
|---|---|---|
| Confirm signup | confirm-signup.html | 你的常來車網验证码 · Your CLCAuto verification code |
| Reset password | recovery.html | 重置常來車網密码 · Reset your CLCAuto password |
| Invite user | invite.html | 你被邀请加入常來車網 · You're invited to CLCAuto |
| Magic link | magic-link.html | 你的常來車網登录验证码 · Your CLCAuto sign-in code |
| Change email address | email-change.html | 确认更改常來車網邮箱 · Confirm your CLCAuto email change |
| Reauthentication | reauthentication.html | 常來車網身份确认验证码 · Your CLCAuto confirmation code |

站点目前只用到 Confirm signup 和 Reset password;其余四个是备用,避免日后触发时发出 Supabase 默认英文模板。Invite 用链接(`{{ .ConfirmationURL }}`)而不是验证码;Change email 的 `{{ .Token }}` 在「双邮箱确认」下发给哪个地址未核实。

发件人显示名:常來車網 CLCAuto
