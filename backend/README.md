# 个人空间：后端开通与验证

前端发布在 https://laibuhui.top/space/ 。已连接独立 Supabase 项目并启用邮件一次性链接登录，关闭公开注册和匿名登录。唯一所有者配置保存在数据库，不在公开源码中。公开演示仅使用内存中的虚构数据，绝不自动降级为真实记录的本地存储。

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
6. 使用默认 Magic Link 邮件，不改模板、不启用付费方案。登录链接自动回到个人空间。第一次使用管理员邀请，之后在网页输入本人邮箱发送登录链接。内置发送器有收件人和频率限制；若投递失败，应检查 Auth 日志与邮件服务要求，不反复重发。自定义模板需自行配置受信任 SMTP 或其他受支持方案，未经授权不付费。
7. Site URL 设为 `https://laibuhui.top/space/`。一次性链接返回的片段凭据在任何认证请求前从浏览器地址与历史中清除；访问令牌经 Auth `/user` 接口验证后才保存，随后还要通过所有者检查及 RLS。不要复制登录链接给别人。
8. 将**公开 Project URL** 和 **publishable key (`sb_publishable_...`)** 填入 `space/config.js`。不是 secret key，也不是 service_role。此配置可公开，权限由数据库 RLS 决定。代码主动拒绝其他格式密钥和非 Supabase HTTPS 域名。
9. 在真实账号下验证登录、保存、刷新、退出；退出后关闭页面，浏览器返回键不能加载私人内容。
10. 创建临时非所有者测试账号和一条所有者测试记录；按 `backend/verify-access.sql` 提示填入三个 UUID，在事务中测试匿名、非所有者及本人权限。已在实际数据库事务中验证本人新增/读取/修改、其他身份拒绝、匿名拒绝和禁止行归属更改；测试数据回滚，不留入账。完成后清理测试账号和测试数据。没有实际执行就不能声称数据库权限已经验证。
11. 修改 `space/config.js` 后更新 `space/index.html` 中的资源版本参数以及 `app.js`、`api.js` 的模块导入版本参数，随后发布并检查真实生产版本。

## 数据模型

- `learning_goals`：目标、方向、目标日期、进行中/已完成。
- `study_sessions`：学习内容、日期、分钟、笔记。
- `finance_entries`：日期、收入/支出、金额、币种、分类、备注。
- `monthly_budgets`：每月每币种一份预算。

学习和财务内容只保存在 Supabase。会话令牌放在当前标签页的 `sessionStorage`，刷新仍可登录；退出时清除会话及所有页面记录。关闭标签页通常会结束本地会话，但浏览器的“恢复标签页”可能恢复 sessionStorage；使用共享电脑时必须主动退出。页面没有第三方脚本、字体或统计。所有用户文本经 `textContent` 渲染。

浏览器仅获得 SELECT / INSERT / UPDATE 权限，不能删除记录；可修改错误记录，目标可完成或恢复。RLS 同时检查白名单和每行 `user_id`，不能把记录移交其他账号。所有者名单及特权查询函数位于非公开 `private` schema；对外 RPC 仅用调用者权限返回布尔值，不暴露名单。所有币种独立计算，不执行汇率换算；金额按分汇总。当前没有银行连接、投资交易或生成式 AI 建议。

匿名访客可以看到登录页和虚构演示；真实记录必须通过后端验证。`noindex` 只用于避免搜索收录，不是访问控制。

## 测试与维护

- `node --test tests/space.test.mjs`：币种隔离、月度与周度边界、CSV 公式防护、未配置时关闭网络请求。
- 本机预览：仓库根目录 `python3 -m http.server 8000`，访问 `/space/`。
- 数据库权限测试已经通过；邮箱投递与本人浏览器登录需由本人完成验证，不能仅凭 SQL 权限测试宣称真实邮件登录成功。若项目配置为空，继续显示“登录服务正在配置中”。
- 修改文件后同步更新对应 `?v=` 资源版本；不修改 CNAME 或 NameSilo DNS。
- 数据库备份由项目管理，导出 CSV 仅包含页面所选月份与币种。请在本人设备保管导出文件。

官方文档：
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/api/api-keys

### 平台安全建议

已收紧 Supabase 自动创建的 `public.rls_auto_enable()`，撤销匿名及登录角色的直接执行权限，事件触发器仍由数据库管理员使用。当前采用无密码登录，不为泄漏密码检测提醒开通付费方案。数据库权限检查不代表邮件已经投递到收件箱；以本人实际登录结果为准。
