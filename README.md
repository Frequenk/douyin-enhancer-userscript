# 🎬 网页抖音体验增强

[![Greasy Fork](https://img.shields.io/greasyfork/v/539942?label=Greasy%20Fork&logo=greasyfork&logoColor=white)](https://greasyfork.org/zh-CN/scripts/539942)
[![GitHub stars](https://img.shields.io/github/stars/Frequenk/douyin-enhancer-userscript?style=flat&logo=github&label=Stars&color=white)](https://github.com/Frequenk/douyin-enhancer-userscript/stargazers)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

一个强大的油猴脚本，为网页版抖音提供更纯净、更高效的浏览体验。

## 📸 效果预览

![功能面板截图](https://raw.githubusercontent.com/Frequenk/douyin-enhancer-userscript/master/images/screenshot.jpg)

## ✨ 核心功能

### 1. 🚀 自动跳过
| 功能 | 说明 |
|------|------|
| ⏭️ 跳过直播 | 自动检测并跳过直播内容 |
| ⏭️ 跳过广告 | 自动识别并跳过广告视频 |

### 2. 🚫 智能屏蔽 ⭐
| 功能 | 说明 |
|------|------|
| 🎯 多维度屏蔽 | 支持按**账号名称**、**视频简介**、**#话题标签**三种方式检测关键字 |
| ⚙️ 智能处理 | 可选"不感兴趣"(R键)告诉算法，或仅跳到下一个视频 |
| 📁 导入/导出 | 支持通过 .txt 文件批量管理屏蔽关键字列表 |

### 3. 📺 画质优化
| 功能 | 说明 |
|------|------|
| 🔝 自动最高分辨率 | 智能选择当前视频可用的最高分辨率 (4K > 2K > 1080P...) |
| 🔒 锁定4K | 找到4K视频后可自动关闭此功能，避免不必要的切换 |
| ⚙️ 分辨率筛选 | 只观看指定分辨率的视频，不符合的自动跳过 |

### 4. 🤖 AI智能筛选 ⭐ (需本地Ollama)
| 功能 | 说明 |
|------|------|
| 🧠 内容识别 | 自定义想看的内容（如"风景"、"猫咪"），AI自动筛选 |
| ❤️ 智能点赞 | 当AI判定为喜欢的内容时，可选择自动点赞(Z键) |
| ⚡ 快速决策 | 通过多时间点截图检测，实现快速精准判断 |

### 5. ⚡ 极速模式
| 功能 | 说明 |
|------|------|
| 🕒 定时切换 | 每个视频播放指定时间后自动切换，适合快速浏览 |
| ⏱️ 自定义时间 | 支持固定时间或随机时间模式 (1-3600秒) |

### 6. 📊 数据统计
| 功能 | 说明 |
|------|------|
| 🧾 实时统计 | 工具栏胶囊展示“今[数量][时长]”，打开统计面板查看汇总 |
| 🗓️ 年度视图 | 年度热力图 + 月度柱状图（数量/时长） |
| 📥📤 导入导出 | 支持数据导入/导出，方便备份与迁移 |

### 7. 🎛️ 默认设置
| 功能 | 说明 |
|------|------|
| 🧩 启动默认值 | 可在统计胶囊右侧打开“默认设置”弹窗，统一配置底部栏各功能开关的初始状态 |
| 🔁 下次进入生效 | 保存后不会立刻改动当前会话，下一次打开并进入抖音时按默认值启动 |

## 📦 安装

### 前置要求
浏览器需安装用户脚本管理器：
- [Tampermonkey](https://www.tampermonkey.net/) (推荐)
- [Violentmonkey](https://violentmonkey.github.io/)

### 安装方式

| 来源 | 链接 |
|------|------|
| **Greasy Fork** (推荐) | [🔗 点击安装](https://greasyfork.org/zh-CN/scripts/539942) |
| **GitHub** | [🔗 查看源码](https://github.com/Frequenk/douyin-enhancer-userscript) |

## 🎮 使用方法

1. 打开 [网页版抖音](https://www.douyin.com/)
2. 在播放器底部可看到统一控制面板
3. 点击统计胶囊右侧的“默认设置”按钮，可统一配置各开关的启动默认值
4. 点击各项功能的**标题文字**，即可打开专属设置弹窗
5. 所有设置自动保存在浏览器本地

### ⌨️ 快捷键

| 按键 | 功能 |
|------|------|
| `=` | 开启/关闭"跳过直播"功能 |

## 🤖 AI功能配置 (可选)

如需使用AI智能筛选功能，可选择以下任一方式配置：

### 方式一：使用智谱AI（免费在线）⭐ 推荐

无需本地安装任何软件，注册即可免费使用！

1. 点击 [注册智谱账号](https://www.bigmodel.cn/invite?icode=GrgfvImGKwdq1i6nWogBXQZ3c5owLmCCcMQXWcJRS8E%3D) 获取免费 API Key
2. 在脚本设置中选择「智谱AI」服务商
3. 粘贴 API Key，选择免费模型即可使用

| 免费模型 | 特点 |
|----------|------|
| **GLM-4.6V-Flash** | 视觉推理，速度快（推荐）|

### 方式二：使用 Ollama（本地部署）

如果你有本地 GPU 或希望完全离线使用：

#### 1. 安装 Ollama
下载并安装 [Ollama](https://ollama.com/)，然后下载视觉模型：
```bash
ollama pull qwen3-vl:8b
```

#### 2. 配置跨域访问
由于 Ollama 默认仅允许本地访问，脚本需要调用本地API，因此必须配置 **跨域允许**。

**Windows:**
1. 打开 **控制面板** -> **系统** -> **高级系统设置** -> **环境变量**
2. 在 **用户变量** 中点击 **新建**，添加以下两个变量：
   - 变量名: `OLLAMA_HOST`，变量值: `0.0.0.0`
   - 变量名: `OLLAMA_ORIGINS`，变量值: `*`
3. 点击确定保存，重启 Ollama

**macOS:**
打开终端，运行以下命令，然后重启 Ollama 应用：
```bash
launchctl setenv OLLAMA_HOST "0.0.0.0"
launchctl setenv OLLAMA_ORIGINS "*"
```

**Linux:**
如果使用 systemd 运行：
1. 编辑服务配置: `sudo systemctl edit ollama.service`
2. 在 `[Service]` 下方添加：
   ```ini
   [Service]
   Environment="OLLAMA_HOST=0.0.0.0"
   Environment="OLLAMA_ORIGINS=*"
   ```
3. 重启服务: `sudo systemctl daemon-reload && sudo systemctl restart ollama`

## 🔗 相关链接

| 平台 | 链接 |
|------|------|
| 📜 **Greasy Fork** | https://greasyfork.org/zh-CN/scripts/539942 |
| 💻 **GitHub** | https://github.com/Frequenk/douyin-enhancer-userscript |

## 📄 许可证

本项目采用 [GPL-3.0 License](https://opensource.org/licenses/GPL-3.0) 开源协议。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🧩 开发/构建

本项目支持模块化开发，使用 `esbuild` 打包为单文件用户脚本。

1. 安装依赖：`npm install`
2. 构建输出：`npm run build`
3. 监听构建：`npm run build:watch`

开发源码位于 `src/`，构建产物为根目录的 `douyin-enhancer.user.js`。

## ⭐ 支持

如果这个脚本对你有帮助，请：
- 在 [Greasy Fork](https://greasyfork.org/zh-CN/scripts/539942) 点个好评 👍
- 在 [GitHub](https://github.com/Frequenk/douyin-enhancer-userscript) 给个 Star ⭐
