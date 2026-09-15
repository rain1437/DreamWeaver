<div align="center">

# DreamWeaver · 幻梦织者

**AI 长篇小说创作台 —— 一个文件，一个 App，全部数据留在你自己手里。**

世界观设定库 · SillyTavern 世界书引擎 · 角色卡（叙事地位九级）· 人物关系网 · 逐章出文 · 伏笔追踪 · 数据保险

`单文件 HTML` · `零后端` · `零依赖` · `离线可用` · `可安装到桌面/主屏` · `可打包成 APK`

</div>

---

## 这是什么

一个给「用 AI 写长篇小说」的人准备的工作台。核心思路很简单：

> 把世界观、力量体系、历史年表、角色卡、人物关系**固化进 System Prompt**，
> 每一章生成时按需注入，于是几十万字之后设定依旧不崩。

它不是一个聊天框套壳，而是一整套**围绕长篇创作**的流程：

| 模块 | 解决什么问题 |
| --- | --- |
| 🌍 世界观设定库 | 四大块分类管理，条目化、可按关键词触发注入，不吃上下文 |
| 📚 世界书引擎 | 完整兼容 SillyTavern：30+ 字段、6 种解析格式、分组竞争、递归、向量近似检索 |
| 👤 角色卡 | 9 个细分模块 34 格，独立 AI 扩写/润色/重写；**叙事地位九级**控制戏份权重 |
| 🔗 人物关系网 | 关系表 + SVG 关系图；AI 可从**正式章节**梳理角色与关系（只提示、不擅自改） |
| ✍️ 成文工作台 | 对话出文 / 正文编辑 / 目录阅读 / 故事记忆 / 伏笔追踪 |
| 🛡 数据保险 | IndexedDB 镜像 + 自动快照 + 整库备份 + 存储体检，防浏览器清数据 |
| 🎨 梦幻主题 | 白蓝梦幻磨砂玻璃；手机/平板/桌面自适应；深浅色 + 宽松/紧凑布局 |

**你的 API Key 和你的小说，都不会离开这台设备。**

---

## 三种用起来的方式

### 方式一：在线直接用（推荐，可装成 App）

部署好之后打开：

```
https://<你的用户名>.github.io/<仓库名>/
```

- **Android / Chrome / Edge**：地址栏或页面里会出现 **「安装应用 / 添加到主屏幕」**，点一下就有独立图标，全屏打开、断网也能进。
- **iPhone / iPad（Safari）**：分享按钮 → **「添加到主屏幕」**。

装好之后它和普通 App 没有区别：独立图标、全屏、离线可用（界面部分）。

### 方式二：单文件本地版

下载仓库里的 **`DreamWeaver-单文件版.html`**（就是 `ai-novel-studio-mobile.html`，同一份内容），
双击即用，**不依赖任何外部文件**，可以放 U 盘、发微信、存网盘。

> 这个版本适合：完全离线、接本地 Ollama（`http://localhost:11434/v1`，因为 `file://` 页面不受混合内容限制）、
> 或者不想让数据经过任何服务器的人。

### 方式三：Android APK（可选）

想要真正的 `.apk` 安装包，有两条路：

- **不想碰命令行**：打开 <https://www.pwabuilder.com/> → 填你的 Pages 网址 →
  **Package for stores → Android** → 得到官方签名的 APK。
  （产的是 TWA 壳，指向线上地址，首次打开需联网）
- **想要离线可用的包**：用仓库自带的 **「打包 Android APK」** 工作流，
  产物在 Actions 页面的 Artifacts 里下载（debug 签名，安装时需允许未知来源）。

详见 [`.github/workflows/android.yml`](.github/workflows/android.yml) 与
[`docs/部署到-GitHub-Pages.md`](docs/部署到-GitHub-Pages.md)。

### 第一次使用

1. 右上角 **API 设置** → 填接口地址与 Key（OpenAI / DeepSeek / 通义 / 硅基流动 / 本地 Ollama 都可以）
2. 新建小说 → 填书名、题材、主线
3. **世界观**页录入设定 / 导入 SillyTavern 世界书 JSON
4. **角色卡**页导入角色卡（JSON 或内嵌世界书的 PNG 都支持）
5. 到 **成文工作台** 写梗概开始出文

> 不填 Key 也能用：会进入**演示模式**，用内置文本走通全流程，方便先体验。

---

## 部署到 GitHub Pages（一次配置，永久更新）

1. 把本仓库推到 GitHub（见下方「推到 GitHub」）
2. 仓库 **Settings → Pages**
3. **Source** 选 `GitHub Actions`（推荐）—— 仓库自带 `.github/workflows/pages.yml`，
   以后每次推代码都会自动：构建 → 自检 → 组装 `dist/` → 发布
   - 也可以选 `Deploy from a branch` → 分支 `main`、目录 `/ (root)`，直接用仓库里的 `index.html`
4. 等 Actions 跑完，地址就是 `https://<用户名>.github.io/<仓库名>/`

> **公开仓库**用 Pages 免费；**私有仓库**要用 Pages 需要 GitHub Pro。
> 应用本身不含任何私人数据（数据都在使用者浏览器里），所以公开仓库一般没有隐私问题。

### 推到 GitHub

**方式 A：一行命令（推荐）**

在解压后的目录里执行（Windows）：

```powershell
.\publish.cmd -Repo https://github.com/<你的用户名>/<仓库名>.git
```

> 为什么用 `.cmd` 而不是直接跑 `.ps1`：Windows 默认禁止运行 PowerShell 脚本，
> 会报「在此系统上禁止运行脚本」等错误。`publish.cmd` 只为这一次调用开启绕过，
> **不需要改任何系统设置、也不需要管理员权限**。
>
> 如果你更愿意直接跑 `.ps1`，任选一种：
> - `powershell -NoProfile -ExecutionPolicy Bypass -File .\publish.ps1 -Repo <地址>`
> - 或先执行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`（只需一次）
> - 或先 `Unblock-File .\publish.ps1`（刚下载的压缩包会被标记为「来自网络」）

（在 CI 或其它脚本里调用时，加上环境变量 `DW_NOPAUSE=1`，它就不会停下来等按键。）

这个脚本会自动：构建 → 自检 → 提交 → 推送，并在最后告诉你去哪开 Pages。

**方式 B：手动（不想用脚本）**

```bash
git init
git add .
git commit -m "feat: DreamWeaver 幻梦织者 v8.0 —— 可安装的 AI 小说创作台"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

> 第一次 push 会弹出浏览器让登录 GitHub 授权，按提示走完即可。

**方式 B：网页上传**

在 GitHub 上 **New repository** → **uploading an existing file**，
把本目录所有文件拖进去（**注意 `.github/`、`icons/`、`tools/`、`docs/` 都要一起上传**，
否则 Pages 工作流和图标会缺失）。

> 只想要一个能离线用的文件？直接下载 `DreamWeaver-单文件版.html` 就够了，不必部署。

---

## 开发与构建

成品是**一个 HTML 文件**，但它不是手写的：源码按模块拆分，由 `build.js` 拼接、注入、逐项自检后产出**两个版本**。

```bash
npm run build      # 构建
npm test           # 跑全套测试（构建 + 结构 + 功能，15 个测试文件）
npm run site       # 组装 dist/ 发布目录（就是 Pages 部署的内容）
npm run icons      # 重新生成 App 图标
npm start          # 本地预览 http://localhost:8080（用来测 PWA 安装）
```

`npm run build` 会产出：

| 文件 | 用途 | 不变量 |
| --- | --- | --- |
| `ai-novel-studio-mobile.html` | 单文件本地版（测试基准） | **零外部引用**，双击即用 |
| `DreamWeaver-单文件版.html` | 同上，友好的下载名 | 与上一行内容完全一致 |
| `index.html` | 网页版（Pages 发布用） | 在单文件版基础上追加 PWA 头部 + `pwa.js` |
| `sw.js` | Service Worker | 缓存名里带**构建内容指纹**，发新版自动失效旧缓存 |

### 源码结构

```
build.js                构建脚本：字符串/区块注入 + 全量自检 + 双版本产出
ai-novel-studio.html    基础 HTML（原始骨架，含基础 CSS 与交互）
block-*.txt             注入块：head 设备识别 / 数据保险条 / 启动流程 / 样式

lore-module.js          世界观设定库（四大块 + 分类引擎）
worldbook.js            SillyTavern 世界书引擎（命中、递归、分组、粘滞…）
char-module.js          角色卡（34 格细分 + 叙事地位九级 + 自定义档位）
cast-module.js          人物关系（关系表 / SVG 关系图 / AI 梳理与核查）
chapter-ctx.js          章节上下文工具
safety-module.js        数据保险（IndexedDB 镜像 / 快照 / 备份）
ai-guard.js             全局 AI 铁律（禁止凭空生成）+ 正文净化
dream-module.js         品牌 / 外观设置 / AI 状态浮窗 / 性能缓存
layout-module.js        UI 重编排呈现层（折叠收纳，纯 CSS 驱动）
*.css (txt)             各模块样式

pwa.js / pwa.css        网页版专用：安装引导、SW 注册（单文件版不引用）
sw.src.js               Service Worker 源码模板（构建时写入内容指纹）
manifest.webmanifest    PWA 清单（名称/图标/主题色/全屏方式）

harness.js + body-*.js  测试脚手架 + 各专项测试体
tools/                  图标生成 / 站点组装 / 本地预览 / 测试入口
docs/                   部署与常见问题
```

### 自动化（GitHub Actions）

| 工作流 | 触发 | 做什么 |
| --- | --- | --- |
| `ci.yml` | push / PR | 构建 + 生成图标 + 全套测试 + 上传产物 |
| `pages.yml` | push 到 main | 构建 → `verify.js` 自检 → 组装 `dist/` → 发布 Pages |
| `release.yml` | 打 `v*` tag | 构建测试 → 生成 Release，附件含单文件版与网站包 |
| `android.yml` | 手动触发 | 用 Capacitor 打包 Android APK（可选，不依赖第三方 SDK action） |

### 设计约束（改了也不会破的不变量）

- **向后兼容**：旧版备份、角色卡 JSON、世界书 JSON 都能直接导入；导出的文件也能被旧版读回
- **业务字段不动**：新增数据一律放进 `extensions.moYan`，不增删原有字段
- **不碰 API 请求**：Service Worker 只缓存同源静态资源，非 GET 与跨域请求全部放行（AI 接口不受影响）
- **单文件版零外部依赖**：PWA 相关文件只在网页版生效，构建时会强制校验
- **呈现层可退**：UI 增强全部基于 CSS，呈现层连续出错会自动停用，功能不受影响

---

## 数据安全

浏览器本地存储不是一个「永久仓库」，所以应用内置了四层兜底：

1. **IndexedDB 镜像** — 每次保存立刻双写一份，localStorage 被清也能捞回来
2. **自动快照** — 改动后按间隔留档（可自定义），保留最近 24 份，任意一份都能单独导出
3. **整库备份** — 一键导出全部作品与配置为 JSON，随时导入恢复
4. **存储体检** — 检测无痕模式、存储配额、持久化授权，快写满时主动提醒

仍建议：**养成定期导出备份的习惯**，尤其换浏览器、清缓存、换设备之前。

---

## 常见问题

**Q：手机打开是空白 / 卡住？**
先确认用的是 https 地址（Pages 默认就是）。若从旧版本升级后异常，强制刷新一次即可。

**Q：数据会同步到云端吗？**
不会。没有服务器，没有账号，没有遥测。

**Q：可以接本地 Ollama 吗？**
可以。API 设置里把接口填成 `http://localhost:11434/v1`。
但注意：从 https 页面请求 http 的本地服务会被浏览器拦截 —— 这种情况请用「单文件本地版」打开。

**Q：能离线用吗？**
可以。装成 App 后，已缓存的界面断网也能打开；但 AI 生成本身需要联网（除非你接的是本地模型）。

**Q：APK 和 PWA 装哪个？**
能用「添加到主屏幕」就优先用 PWA（自动更新、体积小）。想要一个能转发给别人的安装包，再用 APK。

更多问题见 [`docs/常见问题.md`](docs/常见问题.md)，部署细节见 [`docs/部署到-GitHub-Pages.md`](docs/部署到-GitHub-Pages.md)。

---

## 更新日志

见 [`CHANGELOG.md`](CHANGELOG.md)。

## 许可

[MIT](LICENSE) —— 自由使用、修改、分发，保留版权声明即可。

## 免责声明

本工具仅提供写作辅助能力，生成内容由你所使用的 AI 模型产出。
请遵守所在地法律与所用模型服务商的条款，不要用它生成违法或侵权内容。
