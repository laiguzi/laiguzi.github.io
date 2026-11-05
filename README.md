# laiguzi · 个人学术主页 / Academic homepage

纯 HTML + CSS + JavaScript，无框架、无依赖、无需构建，适合 GitHub Pages。中英文内容直接写在页面里，关闭 JavaScript 时仍可浏览完整中文页面。无统计脚本、外部字体或第三方运行时。

## 本地预览

在仓库目录执行 `python3 -m http.server 8000`，打开 http://localhost:8000 。不要只用文件浏览器打开 HTML，以便正确预览静态资源。停止服务按 Ctrl+C。

## 内容维护

- `index.html`：个人介绍、研究方向、论文、项目、博客、CV、联系方式。
- `assets/style.css`：颜色、排版、桌面与移动布局。
- `assets/main.js`：语言切换、语言偏好保存、页脚年份。
- `assets/favicon.svg`：网站图标。
- `CNAME`：保持唯一一行 `laibuhui.top`。
- `.nojekyll`：直接发布静态文件，不经过 Jekyll。

每段双语内容成对维护：`<span lang="zh-CN">中文</span><span lang="en">English</span>`。默认中文；右上角切换语言，并在本浏览器记住选择。共享标签如项目名不必重复。新增栏目请同时更新导航。

### 填充待补充内容

1. About：将公开用户名替换为希望展示的姓名，并填写经本人确认的介绍及机构。
2. Publications：用真实论文条目替换占位，建议列出标题、作者、年份、期刊/会议，以及 DOI、预印本、代码链接；不要把“未填写”写成“没有发表”。
3. Projects：更新项目说明与链接。现有三个条目仅核实了公开仓库存在，不代表已发表成果或具体作者贡献。
4. Blog：新增 `blog/文章名.html`，沿用样式和语言脚本，并在首页添加真实文章链接。子目录引用资源使用 `../assets/`，页面应保留 `#language` 和 `#year` 元素，或单独调整脚本。
5. CV：上传本人确认可公开的 `assets/cv.pdf`，用 `<a class="button" href="assets/cv.pdf">Download CV / 下载简历</a>` 替换“待上传”状态。
6. Contact：填写本人确认的学术邮箱及 Scholar / ORCID 等真实链接。当前仅链接公开 GitHub 用户主页。

## 发布与回滚

沿用现有 `master` 分支、仓库根目录发布。不要新建竞争的部署工作流。

1. 在 GitHub Settings → Pages 核实 Source 是 **Deploy from a branch**、Branch 是 **master**、目录是 **/(root)**。已登录 Pages 设置确认：Deploy from a branch、master、/(root)，并确认新版部署成功（提交 435c5b5）。
2. 提交并推送到 master 后，在 Actions 等待 `pages build and deployment` 成功。
3. 检查 http://laibuhui.top 和 https://laibuhui.top 是否显示新主页。
4. 回滚使用 `git revert <新提交>` 后推送，不重写远端历史。重建前基线提交为 `5c63413`。

## 域名与 HTTPS

保留 CNAME，不修改 NameSilo DNS。读取时根域 A 记录为 185.199.108.153、185.199.109.153、185.199.110.153、185.199.111.153；www CNAME 为 laiguzi.github.io。

2026-11-06（Europe/Berlin）已在 Pages 设置确认域名与 DNS 检查成功；证书已签发并生效。外部校验 https://laibuhui.top 返回 200，https://www.laibuhui.top 返回 301 并跳转到根域名。已启用 Enforce HTTPS。页面重建不负责证书签发，若将来出现证书问题，应先在 Settings → Pages 检查证书状态。不要关闭证书校验，不要未经确认删除域名重新绑定，不修改 DNS。若一直无法签发，按 GitHub Pages 官方排错步骤检查当前 DNS、CAA、证书状态和平台服务状态。

- 官方域名文档：https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- 官方 HTTPS 排错：https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https

## 检查清单

预览桌面和手机宽度；切换中英文并刷新；检查导航和外链；确认没有假邮箱、虚构身份、论文或不可用 CV 下载；确保 CNAME 未改变。

## English maintenance notes

This is a dependency-free static site. Edit bilingual content in `index.html`, styles in `assets/style.css`, and language behavior in `assets/main.js`. Chinese and English spans use `lang="zh-CN"` and `lang="en"`. Preview with `python3 -m http.server 8000`. Keep `CNAME` unchanged and publish from the existing master branch at the repository root. Fill in verified biography, publications, CV and contact details before replacing their placeholders. The existing public repository links are verified; descriptions and claims about their outcomes have deliberately not been invented. DNS must remain unchanged. HTTPS is verified and Enforce HTTPS is enabled. Future certificate issues should be checked in authenticated GitHub Pages settings.
