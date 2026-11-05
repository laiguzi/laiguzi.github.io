# 个人空间：后端开通与验证

前端发布在 https://laibuhui.top/space/ 。当前 `space/config.js` 默认为空，真实登录和保存功能关闭；公开演示仅使用内存中的虚构数据，绝不自动降级为真实记录的本地存储。

## 配置顺序

1. 在 Supabase 创建**独立项目**，先确认免费方案和限制，不启用付费服务。不要在已有业务数据库直接运行本目录脚本。
2. 通过 SQL Editor 或授权连接应用 `backend/schema.sql`（一次性迁移）。它创建四张数据表、单一所有者白名单和 RLS 权限。白名单初始为空，所有用户均无法读写记录。
3. 在 Auth 设置中关闭新用户注册（Allow new users to sign up），关闭匿名登录，只启用 Email。此应用不调用注册接口，发送验证码时也使用 `create_user:false`。
4. 在 Auth → Users 中由管理员创建本人邮箱账号，并确认邮箱归属。不要将密码、OTP 或管理密钥放入公开仓库。邮箱应由本人选择；不要默认使用公开学术邮箱。
5. 在管理员 SQL Editor 中执行以下语句，把 UUID 换成刚创建的**本人用户 ID**：

   ```sql
   insert into private.space_owner (singleton, user_id)
   values (true, '本人用户UUID');
   ```

   主键约束只允许一名所有者。更换本人账号要由管理员更新白名单；浏览器无法读写白名单。
6. Auth → Email Templates → Magic Link：正文包含 `{{ .Token }}`，例如“你的登录验证码：{{ .Token }}”，以匹配页面的验证码输入流程。设置验证码有效期和发送频率。遵循 Supabase 邮件服务要求；内置发送器可能只允许向组织成员邮箱发信，其他邮箱需先配置本人有权使用的 SMTP。不要在前端填写 SMTP 凭据。
7. Site URL 设为 `https://laibuhui.top/space/`；本应用手动输入 OTP，不使用 URL 中的访问令牌。
8. 将**公开 Project URL** 和 **publishable key (`sb_publishable_...`)** 填入 `space/config.js`。不是 secret key，也不是 service_role。此配置可公开，权限由数据库 RLS 决定。代码主动拒绝其他格式密钥和非 Supabase HTTPS 域名。
9. 在真实账号下验证登录、保存、刷新、退出；退出后关闭页面，浏览器返回键不能加载私人内容。
10. 创建临时非所有者测试账号和一条所有者测试记录；按 `backend/verify-access.sql` 提示填入三个 UUID，在事务中测试匿名、非所有者及本人权限。完成后清理测试账号和测试数据。没有实际执行就不能声称数据库权限已经验证。
11. 修改 `space/config.js` 后更新 `space/index.html` 中的资源版本参数以及 `app.js`、`api.js` 的模块导入版本参数，随后发布并检查真实生产版本。

## 数据模型

- `learning_goals`：目标、方向、目标日期、进行中/已完成。
- `study_sessions`：学习内容、日期、分钟、笔记。
- `finance_entries`：日期、收入/支出、金额、币种、分类、备注。
- `monthly_budgets`：每月每币种一份预算。

学习和财务内容只保存在 Supabase。会话令牌放在当前标签页的 `sessionStorage`，刷新仍可登录；退出时清除会话及所有页面记录。关闭标签页通常会结束本地会话，但浏览器的“恢复标签页”可能恢复 sessionStorage；使用共享电脑时必须主动退出。页面没有第三方脚本、字体或统计。所有用户文本经 `textContent` 渲染。

浏览器仅获得 SELECT / INSERT / UPDATE 权限，不能删除记录；可修改错误记录，目标可完成或恢复。RLS 同时检查白名单和每行 `user_id`，不能把记录移交其他账号。所有币种独立计算，不执行汇率换算；金额按分汇总。当前没有银行连接、投资交易或生成式 AI 建议。

匿名访客可以看到登录页和虚构演示；真实记录必须通过后端验证。`noindex` 只用于避免搜索收录，不是访问控制。

## 测试与维护

- `node --test tests/space.test.mjs`：币种隔离、月度与周度边界、CSV 公式防护、未配置时关闭网络请求。
- 本机预览：仓库根目录 `python3 -m http.server 8000`，访问 `/space/`。
- 生产启用前必须完成真实登录和数据库权限测试；此前展示“登录服务正在配置中”。
- 修改文件后同步更新对应 `?v=` 资源版本；不修改 CNAME 或 NameSilo DNS。
- 数据库备份由项目管理，导出 CSV 仅包含页面所选月份与币种。请在本人设备保管导出文件。

官方文档：
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/api/api-keys
