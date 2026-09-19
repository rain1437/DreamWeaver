# DreamWeaver · 更新到仓库并打包 APK

这个包里是我对你仓库做好的改动。**你不需要自己跑构建**——推送后 GitHub Actions 会自动重建，并打出 APK。

---

## 一、这次改了什么

| 文件 | 类型 | 说明 |
|---|---|---|
| `ui-theme.css` | **新增** | 全新设计系统：iOS 星空主题（圆角 / 毛玻璃 / 动态岛式顶栏） |
| `ui-overhaul.js` | **新增** | UI 重构层：把上面这套样式 + 侧栏导航 + 模块改名接进构建流水线 |
| `build.js` | **修改** | 只多插入 10 行：在写盘前调用 `ui-overhaul.js` |
| `test-char.js` | **修改** | 断言同步到新的模块名 |
| `test-cast.js` | **修改** | 同上 |
| `ai-novel-studio-mobile.html` | 重新生成 | 单文件版（APK 用的就是它） |
| `DreamWeaver-单文件版.html` | 重新生成 | 同上，友好文件名 |
| `index.html` | 重新生成 | 网页版（GitHub Pages / PWA） |
| `sw.js` | 重新生成 | Service Worker（缓存指纹已更新） |

### 接法说明（重要）

你的仓库是「基础文件 + 模块」经 `build.js` 拼装的，而 APK 工作流第一件事就是跑 `node build.js`。

所以**直接覆盖 `ai-novel-studio-mobile.html` 是没用的**——下次构建就没了。

正确做法是把改动**接进流水线**：`ui-overhaul.js` 在「所有业务改造完成之后、写盘之前」执行，
这样单文件版和网页版会**同时**获得新界面，而且**每次构建都自动生效**。

`.github/workflows/android.yml` **一行都不用改**。

---

## 二、怎么用（二选一）

### 方式 A：本地克隆后覆盖（推荐）

```bash
git clone https://github.com/rain1437/DreamWeaver.git
cd DreamWeaver
```

把本包里的 9 个文件**全部复制进仓库根目录**（覆盖同名文件），然后：

```bash
git add -A
git commit -m "UI 重构：iOS 星空主题 + 侧栏导航 + 模块改名"
git push
```

### 方式 B：只用网页上传

1. 打开 https://github.com/rain1437/DreamWeaver
2. 点 **Add file → Upload files**
3. 把本包里 9 个文件拖进去
4. 底部填个提交信息 → **Commit changes**

> 网页上传会自动替换同名文件，新增的两个也会一起加进去。

---

## 三、打包 APK

推送完成后：

1. 打开仓库的 **Actions** 页
2. 左侧选 **「打包 Android APK（可选 · 手动触发）」** → 点 **Run workflow**
3. 可选填包名和显示名（默认 `com.dreamweaver.studio` / `DreamWeaver`）
4. 等大约 5–10 分钟
5. 进这次运行页面，最底部 **Artifacts** → 下载 `DreamWeaver-APK`

拿到的是 **debug 签名**的 APK，手机上安装时需要允许「安装未知来源应用」。

---

## 四、装到手机后建议先看这几处

- 五个页签：**创世设定 / 世界树·设定库 / 角色星图 / 文风熔炉 / 执笔成章**
- 🎨 外观 → 配色，切到 **星夜**（暗色）——这是「蓝白黑 + 星空」最正的状态
- 数据保险 → 自动快照，确认拨杆是干净的单个圆钮（不再有叠影）
- 跑一次 AI 出文，看状态浮窗 8 秒后是否缩成小圆点

---

## 五、已通过的验证

在推送前我实际跑通了你的整条流水线：

- `node build.js` —— 构建成功，产出 553,839 字符 / 11,479 行
- `node verify.js` —— **27 项全过**
- `node tools/run-tests.js` —— **15 个测试文件、0 失败**
- `node tools/build-site.js` —— 发布目录正常组装

其中 `test-char.js` / `test-cast.js` 原本因为校验旧的模块名而失败，
我已经把断言同步到新名字（**只改断言字符串，测试逻辑没动**）。

---

## 六、两点提醒

1. **仓库必须有 LF 换行。** 仓库原本就依赖这一点（`build.js` 用 `\n` 做精确匹配）。
   如果你在 Windows 上克隆后构建报错，是 `core.autocrlf` 把文件转成了 CRLF——
   用 `git config core.autocrlf false` 重新克隆即可。GitHub Actions 跑在 Linux 上，不受影响。

2. **`ui-theme.css` 是整套外观的总开关。** 以后想调颜色、圆角，
   改这个文件顶部的 `:root` 变量即可，改一处全局生效。
