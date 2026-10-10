# SQUID☆STAR 🦑

小鱿鱼 Kepler 的个人网站，部署在 Cloudflare Pages。

## 文件夹里有什么

- `index.html`：整个网站
- `room/` `about/` `rev/` `rv2/` `wk/` `site/`：图片、gif 等素材
- `functions/api/[[path]].js`：后台小程序，负责留言板、访客计数、日记、状态栏、新影评，数据存在 Cloudflare D1 数据库里

## 上线步骤（只需要做一次）

1. **GitHub**：新建一个仓库（例如 `squidstar`），把这个文件夹里的全部内容传上去。推荐用 GitHub Desktop。
2. **Cloudflare → 存储和数据库 → D1**：创建数据库，名字随意，例如 `squidstar-db`。
3. **Cloudflare → Workers 和 Pages → 创建 → Pages → 连接到 Git**：选择这个仓库，按下面填写：
   - 框架预设：无
   - 构建命令：留空
   - 构建输出目录：`/`
4. 部署完成后，进入这个 Pages 项目 → **设置**：
   - **绑定** → 添加 → D1 数据库：变量名填 `DB`，选第 2 步创建的数据库
   - **变量和机密** → 添加 → 类型选「密钥」：名称填 `ADMIN_KEY`，值填一个只有你知道的长密码
5. **部署** 页面 → 最新一次部署右侧「…」→ **重试部署**，让绑定生效。
6. **自定义域** → 添加 `opkikk.uk`。域名在同一个 Cloudflare 账号里，会自动配置好。

## 怎么当站长

- 用你自己的浏览器打开一次 `https://opkikk.uk/?admin=你的ADMIN_KEY`。
- 之后这个浏览器就会记住你是站长，能看到「写日记」「改状态」「新增影评」这些按钮。
- 网址里的密码会自动消失，但**不要把带密码的网址发给别人**。
- 想退出：打开 `https://opkikk.uk/?logout`。

## 以后怎么更新网站

改完文件推到 GitHub，Cloudflare 会自动重新部署，大约一分钟就能看到更新。
