# 注册 / 重置密码邮件：粘贴说明

模板在 `supabase/email-templates/`,只是仓库文件，粘贴进 Supabase Dashboard 后才生效。两封都只用验证码 `{{ .Token }}`,没有链接。

## 1. SMTP(Resend)

Dashboard → Project Settings → Authentication → **SMTP Settings** → 打开 Enable Custom SMTP:

| 字段 | 填什么 |
|---|---|
| Sender email | noreply@clcauto.com(在 Resend 里验证的域名 clcauto.com;该域名目前没有收信设置) |
| Sender name | 常來車網 CLCAuto |
| Host | smtp.resend.com |
| Port | 465(或 587) |
| Username | resend |
| Password | Resend 的 API key |

保存上面的设置之前:

1. 在 Resend 添加域名 `clcauto.com`,按 Resend 给出的记录在 Cloudflare DNS 添加(SPF / 退信用的 CNAME、DKIM 的 `resend._domainkey` TXT)。
2. (可选)DMARC:Cloudflare DNS 加一条 TXT,名称 `_dmarc`,内容 `v=DMARC1; p=none;`(先只监控，不设汇总邮箱)。
3. 回到 Resend 域名页点 **Verify**,状态变成 **Verified** 后，再去 Supabase 保存 SMTP 设置。

## 2. 发信频率与有效期(同在 Authentication 下)

- **Rate Limits**:接入自定义 SMTP 后可调高每小时发信数。
- 验证码有效期：**Sign In / Providers → Email** 的 Email OTP Expiration。模板里没写具体时长;确认实际值后再改文案。

## 3. 模板

Dashboard → Authentication → **Email Templates**:

| 模板 | Subject | Message body 粘贴 |
|---|---|---|
| Confirm signup | 见 `subjects.md` | `confirm-signup.html` 全文 |
| Reset password | 见 `subjects.md` | `recovery.html` 全文 |

`.txt` 是同文案的纯文本版，留作核对;Dashboard 只有 HTML 正文一栏，不需要粘贴。

保存后用一个测试邮箱分别走一遍注册和忘记密码，确认收到的是验证码、不是链接。
