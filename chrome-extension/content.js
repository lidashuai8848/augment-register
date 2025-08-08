// 自动注册日志 - 内容脚本

class AutoRegisterContent {
  constructor() {
    this.isRunning = false;
    this.emailDomain = 'qq.com'; // 可配置的邮箱域名
    this.maxRetries = 3;
    this.retryDelay = 3000;
    this.init();
  }

  init() {
    // 监听来自 popup 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'START_REGISTRATION') {
        this.startRegistration();
        sendResponse({ success: true });
      }
    });

    // 页面加载完成后检测
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.detectPage();
      });
    } else {
      this.detectPage();
    }
  }

  // 检测页面类型
  detectPage() {
    const url = window.location.href;
    if (url.includes('augmentcode.com')) {
      this.logMessage('success', '🎯 检测到AugmentCode注册页面');
    }
  }

  // 开始注册流程
  async startRegistration() {
    if (this.isRunning) {
      this.logMessage('warning', '⚠️ 注册流程已在运行中');
      return;
    }

    this.isRunning = true;
    this.logMessage('info', '🚀 开始自动注册流程');

    try {
      // 步骤1: 检测并填写邮箱
      await this.fillEmail();
      
      // 步骤2: 点击发送验证码
      await this.clickSendCode();
      
      // 步骤3: 等待并获取验证码
      await this.waitAndFillCode();
      
      // 步骤4: 完成注册
      await this.completeRegistration();
      
      this.logMessage('success', '🎉 自动注册流程完成');
      this.updateStatus('completed');
      
    } catch (error) {
      this.logMessage('error', `❌ 注册失败: ${error.message}`);
      this.updateStatus('failed');
    } finally {
      this.isRunning = false;
    }
  }

  // 填写邮箱地址
  async fillEmail() {
    this.logMessage('info', '📧 正在填写邮箱地址...');
    
    const emailInput = await this.waitForElement('input[type="email"]', 5000);
    if (!emailInput) {
      throw new Error('未找到邮箱输入框');
    }

    // 生成随机邮箱
    const email = this.generateRandomEmail();
    
    // 填写邮箱
    emailInput.value = email;
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    this.logMessage('success', `✅ 邮箱地址已填写: ${email}`);
    this.currentEmail = email;
    
    await this.sleep(1000);
  }

  // 点击发送验证码按钮
  async clickSendCode() {
    this.logMessage('info', '🔘 正在点击发送验证码...');
    
    // 尝试多种可能的按钮选择器
    const buttonSelectors = [
      'button:contains("Continue")',
      'button:contains("continue")',
      'button:contains("发送")',
      'button:contains("获取验证码")',
      'button[type="submit"]',
      '.btn-primary',
      '.continue-btn'
    ];

    let sendButton = null;
    for (const selector of buttonSelectors) {
      sendButton = await this.waitForElement(selector, 2000);
      if (sendButton) break;
    }

    // 如果没找到，尝试通过文本内容查找
    if (!sendButton) {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent.toLowerCase().trim();
        if (text.includes('continue') || text.includes('发送') || text.includes('获取')) {
          sendButton = btn;
          break;
        }
      }
    }

    if (!sendButton) {
      throw new Error('未找到发送验证码按钮');
    }

    sendButton.click();
    this.logMessage('success', '✅ 已点击发送验证码按钮');
    
    await this.sleep(2000);
  }

  // 等待并填写验证码
  async waitAndFillCode() {
    this.logMessage('info', '⏳ 等待验证码输入框出现...');
    
    // 等待验证码输入框出现
    const codeInput = await this.waitForElement('input[name="code"], input[type="number"], input[placeholder*="验证码"], input[placeholder*="code"]', 10000);
    if (!codeInput) {
      throw new Error('未找到验证码输入框');
    }

    this.logMessage('success', '✅ 验证码输入框已出现');
    
    // 等待邮件到达
    await this.sleep(5000);
    
    // 获取验证码
    const code = await this.getVerificationCode();
    if (!code) {
      throw new Error('验证码获取失败');
    }

    // 填写验证码
    codeInput.value = code;
    codeInput.dispatchEvent(new Event('input', { bubbles: true }));
    codeInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    this.logMessage('success', `✅ 验证码已填写: ${code}`);
    
    await this.sleep(1000);
  }

  // 完成注册
  async completeRegistration() {
    this.logMessage('info', '🏁 正在完成注册...');
    
    // 查找提交按钮
    const submitSelectors = [
      'button[type="submit"]',
      'button:contains("Submit")',
      'button:contains("Verify")',
      'button:contains("完成")',
      'button:contains("提交")',
      '.submit-btn',
      '.verify-btn'
    ];

    let submitButton = null;
    for (const selector of submitSelectors) {
      submitButton = await this.waitForElement(selector, 2000);
      if (submitButton) break;
    }

    if (submitButton) {
      submitButton.click();
      this.logMessage('success', '✅ 已提交注册表单');
    } else {
      this.logMessage('warning', '⚠️ 未找到提交按钮，请手动完成');
    }
  }

  // 获取验证码
  async getVerificationCode() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'GET_VERIFICATION_CODE',
        email: this.currentEmail
      }, (response) => {
        if (response && response.success) {
          resolve(response.code);
        } else {
          resolve(null);
        }
      });
    });
  }

  // 生成随机邮箱
  generateRandomEmail() {
    const randomStr = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString().slice(-4);
    return `auto_${randomStr}_${timestamp}@${this.emailDomain}`;
  }

  // 等待元素出现
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        let element = null;
        
        // 处理 :contains 选择器
        if (selector.includes(':contains(')) {
          const match = selector.match(/(.+):contains\("(.+)"\)/);
          if (match) {
            const [, baseSelector, text] = match;
            const elements = document.querySelectorAll(baseSelector);
            for (const el of elements) {
              if (el.textContent.includes(text)) {
                element = el;
                break;
              }
            }
          }
        } else {
          element = document.querySelector(selector);
        }
        
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          resolve(null);
        } else {
          setTimeout(checkElement, 200);
        }
      };
      
      checkElement();
    });
  }

  // 延迟函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 发送日志消息
  logMessage(level, message) {
    chrome.runtime.sendMessage({
      type: 'LOG_MESSAGE',
      level: level,
      message: message
    });
  }

  // 更新状态
  updateStatus(status) {
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATUS',
      status: status
    });
  }
}

// 初始化内容脚本
new AutoRegisterContent();
