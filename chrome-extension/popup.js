// 自动注册日志 - 弹窗脚本

class AutoRegisterPopup {
  constructor() {
    this.logs = [];
    this.isRunning = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadLogs();
    this.checkCurrentTab();
  }

  bindEvents() {
    // 开始注册按钮
    document.getElementById('startBtn').addEventListener('click', () => {
      this.startRegistration();
    });

    // 清除日志按钮
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.clearLogs();
    });

    // 监听来自 background 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'LOG') {
        this.addLog(message.level, message.message);
      } else if (message.type === 'STATUS') {
        this.updateStatus(message.status);
      }
    });
  }

  // 检查当前标签页
  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const isAugmentSite = tab.url.includes('augmentcode.com');
      
      if (isAugmentSite) {
        this.addLog('success', '🎯 检测到AugmentCode注册页面');
        document.getElementById('startBtn').disabled = false;
      } else {
        this.addLog('warning', '⚠️ 请先打开AugmentCode注册页面');
        document.getElementById('startBtn').disabled = true;
      }
    } catch (error) {
      this.addLog('error', '❌ 无法检测当前页面');
    }
  }

  // 开始注册流程
  async startRegistration() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.updateButtonState(true);
    this.showStatus('正在启动自动注册...');

    try {
      // 发送消息给 content script 开始注册
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      chrome.tabs.sendMessage(tab.id, {
        type: 'START_REGISTRATION'
      }, (response) => {
        if (chrome.runtime.lastError) {
          this.addLog('error', '❌ 无法连接到页面，请刷新后重试');
          this.stopRegistration();
        }
      });

    } catch (error) {
      this.addLog('error', `❌ 启动失败: ${error.message}`);
      this.stopRegistration();
    }
  }

  // 停止注册流程
  stopRegistration() {
    this.isRunning = false;
    this.updateButtonState(false);
    this.hideStatus();
  }

  // 更新按钮状态
  updateButtonState(running) {
    const startBtn = document.getElementById('startBtn');
    if (running) {
      startBtn.textContent = '注册中...';
      startBtn.disabled = true;
    } else {
      startBtn.textContent = '开始注册';
      startBtn.disabled = false;
    }
  }

  // 显示状态指示器
  showStatus(message) {
    const status = document.getElementById('status');
    const statusText = status.querySelector('.status-text');
    statusText.textContent = message;
    status.classList.remove('hidden');
  }

  // 隐藏状态指示器
  hideStatus() {
    document.getElementById('status').classList.add('hidden');
  }

  // 更新状态
  updateStatus(status) {
    if (status === 'completed') {
      this.stopRegistration();
      this.addLog('success', '🎉 注册完成！');
    } else if (status === 'failed') {
      this.stopRegistration();
      this.addLog('error', '❌ 注册失败，请检查配置');
    }
  }

  // 添加日志
  addLog(level, message) {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const log = {
      timestamp,
      level,
      message,
      id: Date.now()
    };

    this.logs.unshift(log);
    this.renderLogs();
    this.saveLogs();
  }

  // 渲染日志
  renderLogs() {
    const logsContainer = document.getElementById('logs');
    
    if (this.logs.length === 0) {
      logsContainer.innerHTML = `
        <div class="logs-empty">
          <div class="logs-empty-icon">📝</div>
          <div class="logs-empty-text">暂无日志记录<br>点击"开始注册"开始自动化流程</div>
        </div>
      `;
      return;
    }

    logsContainer.innerHTML = this.logs.map(log => `
      <div class="log-entry ${log.level}">
        <span class="log-time">[${log.timestamp}]</span>
        <span class="log-message">${log.message}</span>
      </div>
    `).join('');

    // 滚动到顶部显示最新日志
    logsContainer.scrollTop = 0;
  }

  // 清除日志
  clearLogs() {
    this.logs = [];
    this.renderLogs();
    this.saveLogs();
    this.addLog('info', '🧹 日志已清除');
  }

  // 保存日志到本地存储
  saveLogs() {
    chrome.storage.local.set({
      'autoRegisterLogs': this.logs.slice(0, 100) // 只保存最近100条
    });
  }

  // 从本地存储加载日志
  async loadLogs() {
    try {
      const result = await chrome.storage.local.get('autoRegisterLogs');
      this.logs = result.autoRegisterLogs || [];
      this.renderLogs();
      
      if (this.logs.length === 0) {
        this.addLog('info', '🚀 AugmentCode自动注册脚本已启动');
      }
    } catch (error) {
      console.error('加载日志失败:', error);
      this.addLog('info', '🚀 AugmentCode自动注册脚本已启动');
    }
  }

  // 获取当前时间字符串
  getCurrentTime() {
    return new Date().toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

// 初始化弹窗
document.addEventListener('DOMContentLoaded', () => {
  new AutoRegisterPopup();
});
