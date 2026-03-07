# AI Agent Guide — douyin-enhancer-userscript

## 项目概览
- 这是一个面向网页版抖音的用户脚本（Tampermonkey / Violentmonkey）。
- 目标：自动跳过直播/广告、关键字屏蔽、分辨率策略、AI筛选（智谱/Ollama）、极速模式等。
- 发布形态：**单文件** `douyin-enhancer.user.js`（用户脚本平台要求）。

## 目录结构
- `src/`：模块化源码
- `src/index.js`：入口
- `src/userscript.header.js`：Userscript 元数据头（构建时拼到输出顶部）
- `src/app/DouyinEnhancer.js`：主应用，负责主循环与调度
- `src/core/`：配置、选择器、视频控制与策略
- `src/ui/`：UIFactory + UIManager（控制面板与弹窗）
- `src/ai/`：AI 检测逻辑（智谱 / Ollama）
- `douyin-enhancer.user.js`：构建产物（可直接发布）
- `build.mjs`：esbuild 构建脚本

## 开发流程
1. 在 `src/` 下进行模块化开发。
2. 构建为单文件：
   - `npm install`
   - `npm run build`
3. 产物为根目录 `douyin-enhancer.user.js`，用于发布到脚本平台。

## 运行/调试建议
- 开发时可用 `npm run build:watch` 持续构建。
- 用户脚本调试主要依赖浏览器控制台日志与页面行为验证。

## 修改约定
- 保持原有功能不变，改动尽量局部可控。
- 新增功能优先拆分到 `src/` 中相应模块。
- 若改动与 UI/AI/策略相关，优先定位到对应目录处理。

## 版本更新约定
- 只有在用户明确要求“做发布准备”“准备发布”“更新版本号 / changelog”之类场景时，才更新 `src/userscript.header.js` 中的 `@version` 与 `@changelog`。
- 日常开发改动默认不改版本号、不改 `@changelog`，也不因为普通改动自动触发发布流程。
- 只有在本次明确属于发布准备时，才需要根据用户可感知的新功能、行为变更、入口变化或使用方式变化同步更新 `README.md`。
- 只要改动了代码，无论是否发布准备，都应执行 `npm run build`，确保根目录产物 `douyin-enhancer.user.js` 与 `src/` 源码保持一致，并便于实际测试。
