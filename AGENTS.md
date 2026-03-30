# AI Agent Guide — douyin-enhancer-userscript

## 项目概览
- 这是一个面向网页版抖音的用户脚本（Tampermonkey / Violentmonkey）。
- 发布形态是单文件 `douyin-enhancer.user.js`，但日常开发应在 `src/` 下进行模块化修改。
- 当前项目同时覆盖两类页面：
  - 普通推荐页 / 短视频页：由 `DouyinEnhancer` 负责。
  - 直播页：由 `LiveEnhancer` 负责。
- 主要能力包括：跳过直播、跳过广告、账号/文案/标签关键字屏蔽、分辨率策略、AI 喜好筛选（Ollama / 智谱）、极速模式、每日统计、默认按钮显示与默认开关设置等。

## 目录结构
- `src/index.js`：入口，负责按路由初始化 `DouyinEnhancer` 或 `LiveEnhancer`，并监听 `pushState` / `replaceState` / `popstate`。
- `src/userscript.header.js`：Userscript 元数据头，构建时拼接到输出顶部。
- `src/app/DouyinEnhancer.js`：主站短视频增强逻辑，负责样式注入、主循环、快捷键、统计联动、UI 插入。
- `src/app/LiveEnhancer.js`：直播页增强逻辑，目前主要负责直播画质按钮和自动最高清。
- `src/core/ConfigManager.js`：配置持久化与默认状态管理；包括功能开关、按钮默认显示状态、AI 配置、关键字配置、分辨率配置、极速模式配置。
- `src/core/VideoDetectionStrategies.js`：视频检测与处理策略，包含广告/直播/关键字/AI/分辨率等决策。
- `src/core/VideoController.js`：点赞、不感兴趣、切换视频等页面动作封装。
- `src/core/NotificationManager.js`：页面提示消息。
- `src/core/selectors.js`：核心 DOM 选择器。
- `src/ui/UIManager.js`：控制面板按钮、统计弹窗、关键字弹窗、AI 配置弹窗、默认按钮设置弹窗等 UI。
- `src/ai/AIDetector.js`：AI 检测逻辑，封装 Ollama / 智谱请求与错误处理。
- `src/stats/StatsStore.js`：统计数据存储。
- `src/stats/StatsTracker.js`：每日统计聚合与刷新通知。
- `src/utils/dom.js`：可见性与视口相关 DOM 工具。
- `build.mjs`：esbuild 构建脚本。
- `douyin-enhancer.user.js`：构建产物，可直接发布；不要把它当作主要修改入口。

## 开发流程
1. 在 `src/` 下定位并修改对应模块，不要直接手改根目录产物。
2. 如需安装依赖，执行 `npm install`。
3. 修改代码后执行 `npm run build`。
4. 确认根目录 `douyin-enhancer.user.js` 已同步更新。

## 运行 / 调试建议
- 开发时可用 `npm run build:watch` 持续构建。
- 用户脚本调试主要依赖浏览器控制台、页面行为验证，以及控制栏按钮/弹窗的实际交互。
- 这是路由内切换频繁的单页环境；涉及初始化或页面识别时，优先检查 `src/index.js` 的路由分发逻辑，而不是只看首次加载。

## 修改约定
- 保持原有功能不变，改动尽量局部、可回滚。
- 新增功能优先拆到现有模块中，而不是继续堆在入口文件。
- 普通视频页逻辑优先改 `src/app/DouyinEnhancer.js`；直播页逻辑优先改 `src/app/LiveEnhancer.js`。
- AI 相关改动通常同时涉及 `src/ai/AIDetector.js`、`src/core/ConfigManager.js`、`src/ui/UIManager.js`。
- 统计相关改动通常同时涉及 `src/stats/StatsTracker.js`、`src/stats/StatsStore.js`、`src/ui/UIManager.js`。
- 按钮、弹窗、控制面板样式与交互优先改 `src/ui/UIManager.js`；全局注入样式通常在 `src/app/DouyinEnhancer.js`。
- 默认按钮设置当前采用“默认开关 + 眼睛控制显示”的交互：
  - 眼睛控制按钮是否显示。
  - 隐藏时必须自动把默认开关设为关。
  - 隐藏状态下如果尝试启用默认开关，应提示“想要默认启用，请先展示按钮”。
- 若修改默认状态持久化逻辑，优先保持对现有 `enabled` / `disabled` / `hidden` / `visible` 存储值的兼容。
- 不要随意更改本地存储 key 名，除非用户明确要求做迁移，并同步处理兼容逻辑。

## 构建与发布约定
- 只有在用户明确要求“做发布准备”“准备发布”“更新版本号 / changelog”等场景时，才更新 `src/userscript.header.js` 中的 `@version` 与 `@changelog`。
- 日常开发默认不改版本号，不改 `@changelog`，也不因为普通改动自动触发发布流程。
- 只有在本次明确属于发布准备时，才需要根据用户可感知的新功能、行为变更、入口变化或使用方式变化同步更新 `README.md`。
- 只要改动涉及用户可感知的新功能、行为变化、设置项变化或文档中已有描述被改写，优先同步更新 `docs/features.md`，不要让“功能详解”落后于实际行为。
- 只要改动了代码，无论是否发布准备，都应执行 `npm run build`，确保根目录产物 `douyin-enhancer.user.js` 与 `src/` 源码保持一致，并便于实际测试。

## 协作建议
- 先判断问题发生在短视频页还是直播页，再决定切入点。
- 先确认状态来自“当前会话开关”还是“默认按钮设置”，避免把即时行为和默认行为混为一谈。
- 涉及页面行为异常时，优先核对 DOM 选择器是否变化，再怀疑业务逻辑。
