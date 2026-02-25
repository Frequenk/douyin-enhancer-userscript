export class NotificationManager {
        constructor() {
            this.container = null;
        }

        createContainer() {
            if (this.container && document.body.contains(this.container)) return;
            this.container = document.createElement('div');
            Object.assign(this.container.style, {
                position: 'fixed',
                top: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: '10001',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
            });
            document.body.appendChild(this.container);
        }

        showMessage(message, duration = 2000) {
            this.createContainer();

            const messageElement = document.createElement('div');
            messageElement.textContent = message;
            Object.assign(messageElement.style, {
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                opacity: '0',
                transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
                transform: 'translateY(-20px)'
            });

            this.container.appendChild(messageElement);

            // Animate in
            setTimeout(() => {
                messageElement.style.opacity = '1';
                messageElement.style.transform = 'translateY(0)';
            }, 10);

            // Animate out and remove
            setTimeout(() => {
                messageElement.style.opacity = '0';
                messageElement.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    if (messageElement.parentElement) {
                        messageElement.remove();
                    }
                    if (this.container && this.container.childElementCount === 0) {
                        this.container.remove();
                        this.container = null;
                    }
                }, 300);
            }, duration);
        }
    }

    // ========== 配置管理模块 ==========
