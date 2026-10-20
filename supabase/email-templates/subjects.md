# 邮件模板与主题行(13 个)

正文按 `{{ .Data.locale }}` 分 zh / zh-hant / en / ko / ja / es / fr 七支,没有 locale / 老账号 / 未知语言一律英文。
主题行:官方文档只说明主题可以放模板变量(Reauthentication 的默认主题就是 `{{ .Token }} is your verification code`),
没有说明主题能否写 if / else 条件,所以 Subject 先用固定的中英主题(5号 方案 A);各语言单独的主题留作备用。
安全通知类的 `{{ .Data }}` 能否取到 user_metadata 文档没有逐个模板说明;取不到时走英文。
粘贴后用测试账号各触发一次,并到 Dashboard → Logs → Auth 看有无 templatemailer 报错(报错时 Supabase 会改发默认模板)。

| 后台名称(Authentication → Emails) | 文件 | 用到的变量 | Subject(粘贴这一列) |
|---|---|---|---|
| Confirm sign up | confirm-signup.html | {{ .Token }} | 你的常來車網验证码 · Your CLCAuto verification code |
| Invite user | invite.html | {{ .ConfirmationURL }} | 你被邀请加入常來車網 · You're invited to CLCAuto |
| Magic link or OTP | magic-link.html | {{ .Token }} | 你的常來車網登录验证码 · Your CLCAuto sign-in code |
| Change email address | email-change.html | {{ .Token }} | 确认更改常來車網邮箱 · Confirm your CLCAuto email change |
| Reset password | recovery.html | {{ .Token }} | 重置常來車網密码 · Reset your CLCAuto password |
| Reauthentication | reauthentication.html | {{ .Token }} | 常來車網身份确认验证码 · Your CLCAuto confirmation code |
| Password changed | password-changed.html | 无 | 你的常來車網密码已更改 · Your CLCAuto password was changed |
| Email address changed | email-changed.html | {{ .OldEmail }} {{ .Email }} | 你的常來車網登录邮箱已更改 · Your CLCAuto sign-in email was changed |
| Phone number changed | phone-changed.html | {{ .OldPhone }} {{ .Phone }} | 你的常來車網手机号已更改 · Your CLCAuto phone number was changed |
| Sign-in method linked | identity-linked.html | {{ .Provider }} | 常來車網账号新增了登录方式 · Sign-in method added to CLCAuto |
| Sign-in method removed | identity-unlinked.html | {{ .Provider }} | 常來車網账号移除了登录方式 · Sign-in method removed from CLCAuto |
| MFA method added | mfa-added.html | {{ .FactorType }} | 常來車網账号新增了验证方式 · Verification method added to CLCAuto |
| MFA method removed | mfa-removed.html | {{ .FactorType }} | 常來車網账号移除了验证方式 · Verification method removed from CLCAuto |

## 各语言主题(备用)

| 文件 | zh | zh-hant | en | ko | ja | es | fr |
|---|---|---|---|---|---|---|---|
| confirm-signup | 你的常來車網验证码 | 你的常來車網驗證碼 | Your CLCAuto verification code | 또와카 인증 코드 | 常来カーネット 認証コード | Tu código de verificación de CLCAuto | Votre code de vérification CLCAuto |
| invite | 你被邀请加入常來車網 | 你被邀請加入常來車網 | You're invited to CLCAuto | 또와카에 초대되었습니다 | 常来カーネットに招待されました | Te han invitado a CLCAuto | Vous êtes invité(e) sur CLCAuto |
| magic-link | 你的常來車網登录验证码 | 你的常來車網登入驗證碼 | Your CLCAuto sign-in code | 또와카 로그인 코드 | 常来カーネット ログインコード | Tu código de acceso a CLCAuto | Votre code de connexion CLCAuto |
| email-change | 确认更改常來車網邮箱 | 確認更改常來車網郵箱 | Confirm your CLCAuto email change | 또와카 이메일 변경 확인 | 常来カーネット メールアドレス変更の確認 | Confirma el cambio de correo en CLCAuto | Confirmez le changement d'e-mail sur CLCAuto |
| recovery | 重置常來車網密码 | 重置常來車網密碼 | Reset your CLCAuto password | 또와카 비밀번호 재설정 | 常来カーネット パスワードの再設定 | Restablece tu contraseña de CLCAuto | Réinitialisez votre mot de passe CLCAuto |
| reauthentication | 常來車網身份确认验证码 | 常來車網身份確認驗證碼 | Your CLCAuto confirmation code | 또와카 본인 확인 코드 | 常来カーネット 本人確認コード | Tu código de confirmación de identidad de CLCAuto | Votre code de confirmation d'identité CLCAuto |
| password-changed | 你的常來車網密码已更改 | 你的常來車網密碼已更改 | Your CLCAuto password was changed | 또와카 비밀번호가 변경되었습니다 | 常来カーネット パスワードが変更されました | Se cambió tu contraseña de CLCAuto | Votre mot de passe CLCAuto a été modifié |
| email-changed | 你的常來車網登录邮箱已更改 | 你的常來車網登入郵箱已更改 | Your CLCAuto sign-in email was changed | 또와카 로그인 이메일이 변경되었습니다 | 常来カーネット ログイン用メールアドレスが変更されました | Se cambió el correo de acceso de tu cuenta de CLCAuto | L'e-mail de connexion de votre compte CLCAuto a été modifié |
| phone-changed | 你的常來車網手机号已更改 | 你的常來車網手機號已更改 | Your CLCAuto phone number was changed | 또와카 휴대폰 번호가 변경되었습니다 | 常来カーネット 電話番号が変更されました | Se cambió el número de teléfono de tu cuenta de CLCAuto | Le numéro de téléphone de votre compte CLCAuto a été modifié |
| identity-linked | 你的常來車網账号新增了登录方式 | 你的常來車網帳號新增了登入方式 | A sign-in method was added to your CLCAuto account | 또와카 계정에 로그인 방법이 추가되었습니다 | 常来カーネット アカウントにログイン方法が追加されました | Se añadió un método de acceso a tu cuenta de CLCAuto | Une méthode de connexion a été ajoutée à votre compte CLCAuto |
| identity-unlinked | 你的常來車網账号移除了登录方式 | 你的常來車網帳號移除了登入方式 | A sign-in method was removed from your CLCAuto account | 또와카 계정에서 로그인 방법이 제거되었습니다 | 常来カーネット アカウントからログイン方法が削除されました | Se eliminó un método de acceso de tu cuenta de CLCAuto | Une méthode de connexion a été supprimée de votre compte CLCAuto |
| mfa-added | 你的常來車網账号新增了验证方式 | 你的常來車網帳號新增了驗證方式 | A verification method was added to your CLCAuto account | 또와카 계정에 인증 방법이 추가되었습니다 | 常来カーネット アカウントに認証方法が追加されました | Se añadió un método de verificación a tu cuenta de CLCAuto | Une méthode de vérification a été ajoutée à votre compte CLCAuto |
| mfa-removed | 你的常來車網账号移除了验证方式 | 你的常來車網帳號移除了驗證方式 | A verification method was removed from your CLCAuto account | 또와카 계정에서 인증 방법이 제거되었습니다 | 常来カーネット アカウントから認証方法が削除されました | Se eliminó un método de verificación de tu cuenta de CLCAuto | Une méthode de vérification a été supprimée de votre compte CLCAuto |

发件人显示名:常來車網 CLCAuto

文案:5号 auth-email-copy-v2 / v3(2026-10-19);用户确认 ko / ja / es / fr 不需要母语者核对。
