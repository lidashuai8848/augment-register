// 自动注册日志 - 后台脚本

class AutoRegisterBackground {
  constructor() {
    this.apiUrl =
      "https://augment-register-9s5d3wguw-huozaifenlanglis-projects.vercel.app/api/code";
    this.init();
  }

  init() {
    // 监听来自 content script 和 popup 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });

    // 插件安装时的初始化
    chrome.runtime.onInstalled.addListener(() => {
      console.log("自动注册插件已安装");
    });
  }

  // 处理消息
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case "GET_VERIFICATION_CODE":
          await this.getVerificationCode(message.email, sendResponse);
          break;

        case "LOG_MESSAGE":
          this.forwardLogToPopup(message.level, message.message);
          break;

        case "UPDATE_STATUS":
          this.forwardStatusToPopup(message.status);
          break;

        default:
          console.log("未知消息类型:", message.type);
      }
    } catch (error) {
      console.error("处理消息失败:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 获取验证码
  async getVerificationCode(email, sendResponse) {
    try {
      this.forwardLogToPopup("info", "📧 正在获取验证码...");

      // 调用 API 获取验证码
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getCode",
          email: email,
        }),
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.code) {
        this.forwardLogToPopup("success", `✅ 验证码获取成功: ${data.code}`);
        sendResponse({ success: true, code: data.code });
      } else {
        throw new Error(data.message || "验证码获取失败");
      }
    } catch (error) {
      console.error("获取验证码失败:", error);
      this.forwardLogToPopup("error", `❌ 验证码获取失败: ${error.message}`);
      sendResponse({ success: false, error: error.message });
    }
  }

  // 转发日志消息到弹窗
  forwardLogToPopup(level, message) {
    chrome.runtime
      .sendMessage({
        type: "LOG",
        level: level,
        message: message,
      })
      .catch(() => {
        // 弹窗可能未打开，忽略错误
      });
  }

  // 转发状态更新到弹窗
  forwardStatusToPopup(status) {
    chrome.runtime
      .sendMessage({
        type: "STATUS",
        status: status,
      })
      .catch(() => {
        // 弹窗可能未打开，忽略错误
      });
  }

  // 生成随机邮箱地址
  generateRandomEmail(domain = "qq.com") {
    const randomStr = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString().slice(-4);
    return `auto_${randomStr}_${timestamp}@${domain}`;
  }

  // 延迟函数
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 初始化后台脚本
new AutoRegisterBackground();
