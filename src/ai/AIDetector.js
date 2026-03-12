import { UIFactory, UIManager } from '../ui/UIManager.js';

export class AIDetector {
        constructor(videoController, config) {
            this.videoController = videoController;
            this.config = config;
            this.API_URL = 'http://localhost:11434/api/generate';
            this.checkSchedule = [0, 1000, 2500, 4000, 6000, 8000];
            this.reset();
        }

        reset() {
            this.currentCheckIndex = 0;
            this.checkResults = [];
            this.consecutiveYes = 0;
            this.consecutiveNo = 0;
            this.hasSkipped = false;
            this.stopChecking = false;
            this.hasLiked = false;
            this.isProcessing = false;
        }

        shouldCheck(videoPlayTime) {
            return !this.isProcessing &&
                !this.stopChecking &&
                !this.hasSkipped &&
                this.currentCheckIndex < this.checkSchedule.length &&
                videoPlayTime >= this.checkSchedule[this.currentCheckIndex];
        }

        async processVideo(videoEl) {
            if (this.isProcessing || this.stopChecking || this.hasSkipped) return;
            this.isProcessing = true;

            try {
                const base64Image = await this.captureVideoFrame(videoEl);
                const aiResponse = await this.callAI(base64Image);
                this.handleResponse(aiResponse);
                this.currentCheckIndex++;
            } catch (error) {
                console.error('AI判断功能出错:', error);
                // 显示错误提示，根据服务商类型显示不同内容
                const provider = this.config.get('aiPreference').provider;
                UIFactory.showErrorDialog(provider, this.extractErrorDetails(provider, error));
                // 关闭AI喜好模式
                this.config.setEnabled('aiPreference', false);
                UIManager.updateToggleButtons('ai-preference-button', false);
                this.stopChecking = true;
            } finally {
                this.isProcessing = false;
            }
        }

        async captureVideoFrame(videoEl) {
            const canvas = document.createElement('canvas');
            const maxSize = 500;
            const aspectRatio = videoEl.videoWidth / videoEl.videoHeight;

            let targetWidth, targetHeight;
            if (videoEl.videoWidth > videoEl.videoHeight) {
                targetWidth = Math.min(videoEl.videoWidth, maxSize);
                targetHeight = Math.round(targetWidth / aspectRatio);
            } else {
                targetHeight = Math.min(videoEl.videoHeight, maxSize);
                targetWidth = Math.round(targetHeight * aspectRatio);
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);

            return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        }

        // 根据服务商选择调用方式
        async callAI(base64Image) {
            const provider = this.config.get('aiPreference').provider;
            if (provider === 'zhipu') {
                return await this.callZhipuAI(base64Image);
            } else {
                return await this.callOllamaAI(base64Image);
            }
        }

        // Ollama 本地 API 调用
        async callOllamaAI(base64Image) {
            const content = this.config.get('aiPreference').content;
            const model = this.config.get('aiPreference').model;

            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: `这是${content}吗?回答『是』或者『不是』,不要说任何多余的字符`,
                    images: [base64Image],
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama请求失败: ${response.status}`);
            }

            const result = await response.json();
            return result.response?.trim();
        }

        // 智谱 API 调用
        async callZhipuAI(base64Image) {
            const content = this.config.get('aiPreference').content;
            const zhipuModel = this.config.get('aiPreference').zhipuModel;
            const apiKey = this.config.get('aiPreference').zhipuApiKey;

            if (!apiKey) {
                throw new Error('智谱 API Key 未配置');
            }

            const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: zhipuModel,
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: `这是${content}吗?回答『是』或者『不是』,不要说任何多余的字符` },
                            { type: 'image_url', image_url: { url: base64Image } }
                        ]
                    }],
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData = null;
                try {
                    errorData = JSON.parse(errorText);
                } catch (_) {
                    errorData = null;
                }

                const apiError = errorData?.error;
                const error = new Error(`智谱请求失败: ${response.status}${apiError?.code ? ` (${apiError.code})` : ''} - ${apiError?.message || errorText}`);
                error.provider = 'zhipu';
                error.status = response.status;
                error.apiCode = apiError?.code || '';
                error.apiMessage = apiError?.message || '';
                error.rawResponse = errorText;
                throw error;
            }

            const result = await response.json();
            // 智谱返回格式: { choices: [{ message: { content: '是' } }] }
            let answer = result.choices?.[0]?.message?.content?.trim() || '';
            // 清理可能存在的 <think> 标签
            answer = answer.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            return answer;
        }

        extractErrorDetails(provider, error) {
            if (provider === 'zhipu') {
                return {
                    status: error?.status || '',
                    code: error?.apiCode || '',
                    message: error?.apiMessage || error?.message || '未知错误',
                    rawResponse: error?.rawResponse || ''
                };
            }

            return {
                message: error?.message || '未知错误'
            };
        }

        handleResponse(aiResponse) {
            const content = this.config.get('aiPreference').content;
            this.checkResults.push(aiResponse);
            console.log(`AI检测结果[${this.checkResults.length}]：${aiResponse}`);

            if (aiResponse === '是') {
                this.consecutiveYes++;
                this.consecutiveNo = 0;
            } else {
                this.consecutiveYes = 0;
                this.consecutiveNo++;
            }

            if (this.consecutiveNo >= 1) {
                this.hasSkipped = true;
                this.stopChecking = true;
                this.videoController.skip(`🤖 AI筛选: 非'${content}'`);
            } else if (this.consecutiveYes >= 2) {
                console.log(`【停止检测】连续2次判定为${content}，安心观看`);
                this.stopChecking = true;

                // 检查是否开启了自动点赞功能
                const autoLikeEnabled = this.config.get('aiPreference').autoLike;
                if (!this.hasLiked && autoLikeEnabled) {
                    this.videoController.like();
                    this.hasLiked = true;
                } else if (!autoLikeEnabled) {
                    console.log('【自动点赞】功能已关闭，跳过点赞');
                }
            }
        }
    }

    // ========== 视频检测策略 ==========
