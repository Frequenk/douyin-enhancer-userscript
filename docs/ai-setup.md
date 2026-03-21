# AI 功能配置

如需使用 AI 智能筛选功能，可选择以下任一方式。

## 方式一：智谱 AI

1. 点击 [注册智谱账号](https://www.bigmodel.cn/invite?icode=GrgfvImGKwdq1i6nWogBXQZ3c5owLmCCcMQXWcJRS8E%3D) 创建账号并获取 API Key
2. 在脚本设置中选择“智谱 AI”服务商
3. 粘贴 API Key，选择模型即可使用

可选模型：

| 模型 | 说明 |
|------|------|
| `GLM-4.6V-Flash` | 免费，高峰期可能不稳定 |
| `GLM-4.6V-FlashX` | 付费，响应更快 |
| `GLM-4.6V` | 付费 |

说明：

- 无资源包时，会按目录价扣智谱账户余额
- `GLM-4.6V-FlashX`：2.9 元 / 1000 万 token
- `GLM-4.6V`：5.9 元 / 1000 万 token
- 上述价格信息来自 2026 年 3 月 12 日看到的活动页，后续若有变化，请以智谱官方说明为准
- 智谱调用失败时，脚本会直接展示接口返回的具体报错内容

## 方式二：Ollama 本地部署

如果你有本地 GPU，或者希望完全离线使用，可以选择 Ollama。

### 1. 安装 Ollama 与视觉模型

下载并安装 [Ollama](https://ollama.com/)，然后拉取视觉模型：

```bash
ollama pull qwen3-vl:8b
```

### 2. 配置跨域访问

由于脚本需要从浏览器访问本地 Ollama API，因此必须允许跨域。

#### Windows

1. 打开“控制面板” -> “系统” -> “高级系统设置” -> “环境变量”
2. 在“用户变量”中新增以下两个变量：
3. `OLLAMA_HOST=0.0.0.0`
4. `OLLAMA_ORIGINS=*`
5. 保存后重启 Ollama

#### macOS

打开终端执行：

```bash
launchctl setenv OLLAMA_HOST "0.0.0.0"
launchctl setenv OLLAMA_ORIGINS "*"
```

然后重启 Ollama 应用。

#### Linux

如果使用 systemd 运行 Ollama：

1. 编辑服务配置：`sudo systemctl edit ollama.service`
2. 在 `[Service]` 下添加：

```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0"
Environment="OLLAMA_ORIGINS=*"
```

3. 重启服务：

```bash
sudo systemctl daemon-reload && sudo systemctl restart ollama
```

## 返回首页

- [README](../README.md)
