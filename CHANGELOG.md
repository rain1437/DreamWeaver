# 更新日志

本项目遵循「一个版本一个可用的单文件」的节奏。
版本号写在 `package.json` 与页脚注释里，`sw.js` 的 `VERSION` 需同步 +1（否则浏览器不会刷新离线缓存）。

## v8.0.3

**修复 Android APK 工作流（准备 SDK 阶段失败）**

- 报错 “`sdkmanager` failed with exit code 1” 来自第三方 action `android-actions/setup-android`，
  它自己又调了一次 sdkmanager。而 GitHub 的 ubuntu 运行器**本来就预装了 Android SDK**
  （报错里的 `/usr/local/lib/android/sdk` 就是它），所以那个 action 纯属多余 —— **已整个移除**。
- 改为直接使用预装 SDK：`sdkmanager` 路径改为自动发现（不同镜像放在 `cmdline-tools/latest`
  或带版本号的目录），许可与组件安装都做成「尽力而为」，即使告警也不阻断构建。
- APK 里只放**单文件版**（`ai-novel-studio-mobile.html` → `www/index.html`）：
  它零外部引用、无 Service Worker，不会出现「更新 APK 后仍是旧界面」的离线缓存问题，
  也少了一堆要拷贝的文件。
- 不再用 `cap init`（会生成需要 TypeScript 的 .ts 配置），改为直接写 `capacitor.config.json`，
  少一个交互/依赖风险点。
- APK 图标换成项目自己的星月图标；补上 `usesCleartextTraffic`（便于接本地 Ollama）。
- 失败时会把 `build/outputs` 目录列出来，便于排查；产物统一命名为
  `<应用名>-<分支>-debug.apk`。

## v8.0.2

**修复一键发布脚本（publish.ps1 / publish.cmd）**

- 新增 `publish.cmd`：Windows 默认禁止运行 `.ps1`，用这个外壳即可一键发布，
  **不需要改执行策略、也不需要管理员权限**（内置 `-ExecutionPolicy Bypass`）
- 修复两个会让你直接卡住的真 bug：
  1. `function Git` 遮蔽了 `git.exe`（PowerShell 命令名不区分大小写，函数优先级高于外部程序），
     函数内部再调 `git` 变成无限递归自己，脚本碎溢出。现改为 `Invoke-GitRaw` + 只调用
     解析出来的 git 完整路径。
  2. `$ErrorActionPreference='Stop'` 碰到 git 往 stderr 写正常信息就中断，
     脚本会在「提交」那一步莫名失效；且 `git config` 原本跑在 `git init` 之前。
- 参数名 `$Args` 改为 `$ArgList`（`$Args` 是 PowerShell 自动变量，会吞掉传入参数）
- 提交身份只写入本仓库（不动你的全局 git 配置）；显式关闭 CRLF 警告刷屏
- 脚本不再无限等待按键：仅双击运行才 `pause`，自动化场景设 `DW_NOPAUSE=1`

## v8.0.1

**发布形态梳理（把仓库变成「拿来就能上线」的状态）**

- 构建明确产出**两个版本**：
  - `ai-novel-studio-mobile.html` / `DreamWeaver-单文件版.html` —— 零外部引用的单文件版
  - `index.html` + `sw.js` —— 网页版（PWA，Pages 发布用）
- 修复 `OUT` 默认值导致的产物互相覆盖（单文件版之前会被网页版盖掉）
- 修复 `sw.js` 构建指纹只替换了注释里那一处，真正的 `BUILD` 常量仍是占位符（旧缓存不会失效）
- `verify.js` 拆成「单文件版 + 网页版 + 发布目录」三段校验，各管各自的不变量
- `tools/build-site.js` 补齐 `pwa.js` / `pwa.css`（否则线上会 404）
- 新增可选工作流 `android.yml`：手动触发即打包 Android APK
- `release.yml` 改为发布正确的单文件版文件名

## v8.0.0

**UI 重编排 + 发布为 App**

- 手机端收纳：长说明折进 `.accordion` 面板（手机默认收起 / 桌面默认展开），高级参数分组折叠，
  工具条次要按钮收进「更多 ⋯」，网格强制单栏，留白加大
- 视觉升级：主卡片磨砂 / 子卡片实色、按钮四层分级、`ⓘ` 信息气泡、
  空状态内联 SVG 符号、标签栏渐变遮罩、状态浮窗三态微光、暗色模式打磨
- 触屏规范：可点控件 ≥44px、输入框 16px 防 iOS 缩放、`overscroll-behavior:contain`
- 性能：所有 `backdrop-filter` 限幅 ≤12px，低配/减少动态全量降级
- **PWA**：新增 `manifest.webmanifest` + `sw.js`，可安装到桌面、离线可用
- **发布链路**：GitHub Actions 自动构建 / 测试 / 部署 Pages / 打 tag 发 Release

## v7.0.0

**品牌与存储重构 + 梦幻主题 + 全局 AI 铁律**

- 更名 **DreamWeaver · 幻梦织者**（标题、Logo、favicon、导出前缀、存储键前缀）
- 本地存储键迁移到 `dw-` 前缀（旧键自动搬运并保留，老数据依旧可读）
- 白蓝梦幻主题：星空薄雾背景、磨砂玻璃、暗色夜空模式、宽松/紧凑布局
- AI 工作状态浮窗（非模态、不抢焦点，可关闭）
- 保存链路强化：即时镜像到 IndexedDB、`pagehide` 落盘、配额预警、快照间隔自定义
- 性能：提示词缓存、上下文打包 memo、流式输出合帧、大列表渐进展示
- 详情体验：页签红点、字段提示气泡、拖拽虚影、键盘避让

## v6.2.0

- 角色分类支持**用户自定义档位**（新增/改名/删除/位置）
- AI 梳理**不再擅自改动**主角与重要配角的叙事地位（可一键采纳建议）
- 修复「下一章建议」可能混入正文的问题（提示词约束 + 写入前净化双保险）
- 全局 AI 调用增加**已有信息清单 + 铁律**：不得凭空生成人物、地名、数值

## v6.1.0

- 叙事地位由「主角/重要人物/NPC」重构为**九级体系**
  （第一主角 / 对等双主角 / 第二主角 / 核心配角 / 重要配角 / 普通配角 / 功能性NPC / 背景路人 / 传说人物）
- 写作权重规则进 System Prompt；导入 SillyTavern 角色卡时自动判定地位

## v6.0.0

- 人物关系模块：关系表 + SVG 关系图 + AI 从正式章节梳理 + AI 核查（仅提示）
- 角色定位徽标与筛选

## v5.x 及更早

- 数据保险（IndexedDB 镜像 / 自动快照 / 整库备份 / 存储体检）
- 世界观设定库四大块 + 世界书导入自动分类（准确度 40/40）
- SillyTavern 世界书引擎全兼容、角色卡 34 格细分与无损导出
- 设备自适应（手机 / 平板 / 桌面）、对话出文工作台、伏笔追踪
