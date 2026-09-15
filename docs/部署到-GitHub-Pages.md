# 部署到 GitHub Pages（把 DreamWeaver 变成在线 App）

目标：拿到一个 `https://…github.io/…/` 的地址，手机打开能「添加到主屏幕」当 App 用。

全程只需要一次配置，之后每次更新只要 `git push`，线上自动更新。

---

## 一、先推到 GitHub

### 准备（只需一次）

```powershell
git config --global user.name  "你的名字"
git config --global user.email "你的邮箱"
```

### 创建仓库并推送

在 GitHub 网页上点 **New repository**：

- **Repository name**：例如 `dreamweaver`（英文，短一点，它会出现在网址里）
- **Visibility**：`Public`（公开）—— 免费账号的 Pages 需要公开仓库
- ⚠️ **不要**勾选 "Add a README file"（本地已有，避免冲突）

然后在本地项目目录执行：

```powershell
git init
git add .
git commit -m "feat: DreamWeaver 幻梦织者 v8.0"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

> 第一次 push 会弹出浏览器让你登录 GitHub 授权，按提示走完即可。

### 不想用命令行？

GitHub 仓库页面 → **Add file → Upload files** → 把项目里的文件拖进去（**注意要连同
`icons/`、`tools/`、`.github/` 这些文件夹一起拖**，`.github` 是隐藏目录，Windows 资源管理器里
需要先在「查看」里勾选「隐藏的项目」才能看到）→ 底部 **Commit changes**。

---

## 二、开启 Pages（二选一）

### 方案 A：用仓库自带的 Actions（推荐）

本项目已经内置 `.github/workflows/pages.yml`，推上去就会自动构建并发布。

1. 仓库 → **Settings** → 左侧 **Pages**
2. **Build and deployment → Source** 选 **`GitHub Actions`**
3. 到 **Actions** 标签页，能看到 `部署到 GitHub Pages` 这个工作流在跑
4. 跑完（约 1 分钟）回到 Pages 页面，顶部会显示你的网址：

```
https://<用户名>.github.io/<仓库名>/
```

之后每次 `git push`，它都会重新构建并发布。

### 方案 B：直接从分支发布（更简单，但产物要跟着提交）

1. **Settings → Pages → Source** 选 `Deploy from a branch`
2. **Branch** 选 `main`，目录选 `/ (root)`，保存
3. 等一两分钟，网址同上

> 这种方式用的是仓库根目录的文件，所以 `index.html` 必须已经提交进仓库
> （本项目已经提交了构建好的 `index.html`，所以直接可用）。

---

## 三、手机安装成 App

**Android（Chrome / Edge）**

1. 用浏览器打开你的网址
2. 右上角菜单 → **安装应用 / 添加到主屏幕**
3. 桌面会出现星月图标，点开即全屏运行，断网也能进（界面已被离线缓存）

**iOS（Safari）**

1. 用 Safari 打开网址（必须 Safari，Chrome for iOS 不支持添加到主屏幕）
2. 底部 **分享** 按钮 → **添加到主屏幕**
3. 之后从桌面图标打开，就是无地址栏的 App 界面

**桌面（Chrome / Edge）**

地址栏右侧会出现一个「安装」小图标，点它即可装成一个独立窗口的程序。

---

## 四、更新线上版本

改完代码后：

```powershell
git add .
git commit -m "修：xxx"
git push
```

Actions 会自动重新构建、测试、发布，1 分钟后刷新即可看到新版。

> ✅ 不用手工改版本号：构建时会把**内容指纹**写进 `sw.js` 的 `BUILD` 常量，
> 只要应用内容有变化，缓存名就跟着变，旧缓存会自动失效。
> 只有在「同一份内容反复部署」时才需要手动处理：手机上强制刷新一次即可。

### 想发一个正式版

```powershell
git tag v8.0.0
git push --tags
```

`release.yml` 会自动打包并创建 Release，附上：

- `DreamWeaver-单文件版.html` —— 随手可发的单文件
- `DreamWeaver-网站包.zip` —— 完整 PWA 站点包（丢到任意静态托管都能用）

---

## 五、可选：绑定自己的域名

1. 在域名服务商加一条 CNAME 记录，指向 `<用户名>.github.io`
2. 仓库 **Settings → Pages → Custom domain** 填你的域名
3. 勾选 **Enforce HTTPS**

（自定义域名对 PWA 安装、Service Worker 都更友好。）

---

## 六、常见坑

| 现象 | 原因 / 解决 |
| --- | --- |
| Pages 页面找不到设置项 | 免费账号的私有仓库不支持 Pages，把仓库改成 Public |
| 打开是 404 | 确认根目录有 `index.html`（注意大小写），并且已经 push |
| 页面空白 | 打开浏览器控制台看报错；多是路径问题，确认 `icons/`、`sw.js`、`manifest.webmanifest` 都在 |
| 手机上还是旧版 | 清一下该站点的缓存，或把 `sw.js` 的 `VERSION` 加一重新部署 |
| 域名下要放到子目录 | 本应用全部用相对路径，放在任意子目录都能跑 |
| 想撤掉线上站点 | Settings → Pages → Source 改回 `None` |

---

## 七、可选：打包成 Android APK

如果你想要一个能直接安装、能转发给别人的 `.apk`（而不是「添加到主屏幕」）：

1. 仓库 → **Actions** → 左侧选 **「打包 Android APK（可选 · 手动触发）」**
2. 右侧 **Run workflow** → 应用名与包名可留默认 → 运行
3. 等 5～10 分钟（首次要下载 Gradle 与依赖）
4. 在运行记录的底部 **Artifacts** 里下载 `DreamWeaver-APK`

拿到的是 **debug 签名**的 APK：

- 拷到手机后需要在系统设置里允许「安装未知来源应用」
- 想要正式签名（能上应用商店 / 升级不掉数据）：自己生成 keystore，
  放进 GitHub Secrets，把工作流里的 `assembleDebug` 改成 `assembleRelease` 并配置签名

> 💡 **更省事的办法（不想碰 Actions）**：既然你的 App 已经通过 Pages 上线了，
> 可以直接用微软官方的在线打包服务：
>
> 1. 打开 <https://www.pwabuilder.com/>
> 2. 填你的网址（如 `https://你的用户名.github.io/仓库名/`）
> 3. 点 **Package for stores → Android**，下载它生成的 **已签名 APK**（.apk 或 .aab）
>
> 区别：PWABuilder 出的是 TWA（外层壳浏览器），会**指向你的线上地址**，
> 所以首次打开需要联网；仓库里这个工作流出的是内置离线的 WebView 包，
> 断网也能打开。两者选一个就行。

> 关于失败：如果你看到 “`sdkmanager` failed with exit code 1”，那是旧版工作流
> 用了第三方 action `android-actions/setup-android` 造成的，新版已彻底移除，不再依赖它。

---

## 八、部署到哪里都行（不限于 GitHub）

本项目本质是**纯静态站点**，`npm run site` 生成的 `dist/` 目录可以直接丢给：

- Cloudflare Pages
- Vercel / Netlify
- 任意对象存储（OSS / COS / S3）+ CDN
- 自己的 Nginx

唯一要求：**必须使用 https**（PWA 安装与 Service Worker 的硬性前提）。
