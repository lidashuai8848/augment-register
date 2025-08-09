// ==UserScript==
// @name        Augment 全自动注册 - 完整验证码流程
// @namespace   augment-complete-flow
// @version     5.0
// @description 完整的Augment官网自动注册流程，包含验证码自动处理
// @author      Zk
// @match       https://augmentcode.com/*
// @match       https://www.augmentcode.com/*
// @match       https://login.augmentcode.com/*
// @match       https://*.augmentcode.com/*
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_log
// @connect     augment-register.vercel.app
// ==/UserScript==

(() => {
  "use strict";

  /* ======== 配置 ======== */
  const API_URL = "https://augment-register.vercel.app/api/code"; // 修改为你的 Vercel 部署地址
  const DOMAIN = "zkllk.anonaddy.com"; // 修改为你的 AnonAddy 域名
  const MAX_RETRY_ATTEMPTS = 5; // 验证码获取最大重试次数
  const RETRY_INTERVAL = 3000; // 重试间隔（毫秒）
  const PAGE_TRANSITION_WAIT = 2000; // 页面跳转等待时间
  /* ====================== */

  /* ---- 通用工具 ---- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const randStr = () => Math.random().toString(36).slice(2, 10);

  // 日志工具
  const log = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
    console.log(`[${timestamp}] ${prefix} ${message}`);
    updateStatus(prefix, message, type);
  };

  /* ---- 精准 DOM 选择器 ---- */
  const $ = {
    // 邮箱输入框 - 参考完整代码的选择器顺序
    email: () =>
      document.querySelector('input[name="username"]') ||
      document.querySelector('input[name="email"]') ||
      document.querySelector('input[id="email"]') ||
      document.querySelector('input[type="email"]') ||
      document.querySelector('input[inputmode="email"]') ||
      document.querySelector('input[placeholder*="email" i]') ||
      document.querySelector('input[placeholder*="邮箱"]'),

    // 验证码输入框 - 按要求使用 input[name="code"]
    code: () =>
      document.querySelector('input[name="code"]') ||
      document.querySelector('input[name="otp"]') ||
      document.querySelector('input[name="verification_code"]') ||
      document.querySelector('input[type="number"]') ||
      document.querySelector('input[maxlength="6"]') ||
      document.querySelector('input[placeholder*="验证码" i]') ||
      document.querySelector('input[placeholder*="code" i]'),

    // 继续按钮 - 改进按钮查找逻辑
    continueBtn: () =>
      document.querySelector('button[type="submit"]') ||
      document.querySelector('button[name="action"]') ||
      document.querySelector('button[data-action-button-primary="true"]') ||
      [...document.querySelectorAll("button")].find((b) =>
        b.textContent.trim().toLowerCase().includes("continue")
      ) ||
      [...document.querySelectorAll("button")].find((b) =>
        b.textContent.trim().toLowerCase().includes("继续")
      ),

    // 通用按钮查找
    btn: (text) =>
      [...document.querySelectorAll("button")].find((b) =>
        b.textContent.trim().toLowerCase().includes(text.toLowerCase())
      ),

    // 服务条款复选框
    agree: () =>
      document.querySelector('input[type="checkbox"]') ||
      document.querySelector('input[name*="agree" i]') ||
      document.querySelector('input[name*="terms" i]') ||
      document.querySelector('input[id*="terms"]'),
  };

  /* ---- 等待元素出现 ---- */
  const wait = (selFn, timeout = 10000) =>
    new Promise((resolve, reject) => {
      // 先立即检查一次
      const immediate = selFn();
      if (immediate) {
        resolve(immediate);
        return;
      }

      const t0 = Date.now();
      const timer = setInterval(() => {
        try {
          const el = selFn();
          if (el) {
            clearInterval(timer);
            log(
              `找到元素: ${el.tagName}${el.name ? `[name="${el.name}"]` : ""}${
                el.type ? `[type="${el.type}"]` : ""
              }`,
              "success"
            );
            resolve(el);
          }
          if (Date.now() - t0 > timeout) {
            clearInterval(timer);
            reject(new Error(`等待元素超时 (${timeout}ms)`));
          }
        } catch (error) {
          clearInterval(timer);
          reject(new Error(`查找元素时出错: ${error.message}`));
        }
      }, 200);
    });

  /* ---- 状态管理 ---- */
  let statusPanel = null;
  let currentEmail = null;

  // 创建状态面板
  function createStatusPanel() {
    if (statusPanel) return statusPanel;

    const panel = document.createElement("div");
    panel.id = "augment-status-panel";
    panel.innerHTML = `
      <div class="panel-header">
        <span class="title">🚀 Augment 自动注册</span>
        <button class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">×</button>
      </div>
      <div class="status-bar">
        <span class="status-icon">🔍</span>
        <span class="status-text">准备开始注册...</span>
      </div>
      <div class="email-info">
        <span class="email-label">邮箱地址：</span>
        <span class="email-value">未生成</span>
        <button class="refresh-email-btn" id="refresh-email-btn" title="重新生成邮箱">🔄</button>
      </div>
      <div class="action-buttons">
        <button class="start-btn" id="start-registration-btn">开始注册</button>
        <button class="manual-code-btn" id="manual-code-btn" style="display:none">手动输入验证码</button>
      </div>
      <div class="log-container">
        <div class="log-header">操作日志</div>
        <div class="log-content"></div>
      </div>
    `;

    document.body.appendChild(panel);
    statusPanel = panel;

    // 绑定按钮事件
    const startBtn = panel.querySelector("#start-registration-btn");
    const manualBtn = panel.querySelector("#manual-code-btn");

    if (startBtn) {
      startBtn.addEventListener("click", () => {
        startBtn.disabled = true;
        startBtn.textContent = "正在注册...";
        startRegistration().finally(() => {
          startBtn.disabled = false;
          startBtn.textContent = "开始注册";
        });
      });
    }

    if (manualBtn) {
      manualBtn.addEventListener("click", showManualCodeInput);
    }

    // 绑定重新生成邮箱按钮
    const refreshEmailBtn = panel.querySelector("#refresh-email-btn");
    if (refreshEmailBtn) {
      refreshEmailBtn.addEventListener("click", () => {
        const newEmail = randStr() + "@" + DOMAIN;
        currentEmail = newEmail; // 确保全局变量同步更新
        updateEmailDisplay(newEmail);
        log(`重新生成邮箱: ${newEmail}`, "success");
      });
    }

    return panel;
  }

  // 更新状态
  function updateStatus(icon, text, type = "info") {
    const panel = statusPanel || createStatusPanel();
    const statusIcon = panel.querySelector(".status-icon");
    const statusText = panel.querySelector(".status-text");
    const statusBar = panel.querySelector(".status-bar");

    if (statusIcon && statusText && statusBar) {
      statusIcon.textContent = icon;
      statusText.textContent = text;

      // 根据类型设置颜色
      statusBar.className = `status-bar ${type}`;

      // 添加到日志
      addLog(icon + " " + text, type);
    }
  }

  // 添加日志
  function addLog(message, type = "info") {
    const panel = statusPanel || createStatusPanel();
    const logContent = panel.querySelector(".log-content");

    if (logContent) {
      const logEntry = document.createElement("div");
      logEntry.className = `log-entry ${type}`;
      logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      logContent.appendChild(logEntry);
      logContent.scrollTop = logContent.scrollHeight;
    }
  }

  // 更新邮箱显示
  function updateEmailDisplay(email) {
    const panel = statusPanel || createStatusPanel();
    const emailValue = panel.querySelector(".email-value");
    if (emailValue) {
      emailValue.textContent = email;
      currentEmail = email; // 确保全局变量同步更新
    }
  }

  /* ---- 验证码获取函数 ---- */
  async function getVerificationCode(email, retryCount = 0) {
    return new Promise((resolve, reject) => {
      log(
        `正在获取验证码... (尝试 ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`,
        "info"
      );

      GM_xmlhttpRequest({
        method: "POST",
        url: API_URL,
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({ email: email }),
        timeout: 10000,
        onload: (response) => {
          try {
            if (response.status === 200) {
              const data = JSON.parse(response.responseText);
              if (data.code && /^\d{6}$/.test(data.code)) {
                log(`成功获取验证码: ${data.code}`, "success");
                resolve(data.code);
              } else {
                log("API返回数据格式错误", "error");
                reject(new Error("验证码格式错误"));
              }
            } else {
              log(`API请求失败: ${response.status}`, "error");
              reject(new Error(`HTTP ${response.status}`));
            }
          } catch (error) {
            log(`解析响应失败: ${error.message}`, "error");
            reject(error);
          }
        },
        onerror: (error) => {
          log(`网络请求失败: ${error}`, "error");
          reject(new Error("网络错误"));
        },
        ontimeout: () => {
          log("请求超时", "error");
          reject(new Error("请求超时"));
        },
      });
    });
  }

  /* ---- 手动输入验证码 ---- */
  function showManualCodeInput() {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "manual-code-modal";
      modal.innerHTML = `
        <div class="modal-content">
          <h3>手动输入验证码</h3>
          <p>请检查邮箱 <strong>${currentEmail}</strong> 并输入收到的6位验证码：</p>
          <input type="text" class="code-input" maxlength="6" placeholder="000000" />
          <div class="modal-buttons">
            <button class="confirm-btn">确认</button>
            <button class="cancel-btn">取消</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const input = modal.querySelector(".code-input");
      const confirmBtn = modal.querySelector(".confirm-btn");
      const cancelBtn = modal.querySelector(".cancel-btn");

      input.focus();

      const cleanup = () => document.body.removeChild(modal);

      confirmBtn.onclick = () => {
        const code = input.value.trim();
        if (/^\d{6}$/.test(code)) {
          cleanup();
          resolve(code);
        } else {
          alert("请输入6位数字验证码");
        }
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") confirmBtn.click();
      });
    });
  }

  /* ---- 完整自动化流程 ---- */
  async function startRegistration() {
    try {
      log("开始自动注册流程", "info");

      // 步骤1: 确保使用已生成的邮箱账号
      log("步骤1: 确保使用已生成的邮箱账号", "info");
      if (!currentEmail) {
        // 如果没有邮箱，生成一个新的
        const newEmail = randStr() + "@" + DOMAIN;
        currentEmail = newEmail;
        updateEmailDisplay(newEmail);
        log(`生成新邮箱: ${newEmail}`, "success");
      }

      // 使用全局变量中的邮箱，确保一致性
      const email = currentEmail;
      log(`使用邮箱: ${email}`, "success");

      // 步骤2: 填写邮箱到输入框
      log("步骤2: 查找并填写邮箱输入框", "info");
      const emailInput = await wait($.email, 10000);
      if (!emailInput) {
        throw new Error("未找到邮箱输入框");
      }

      log(
        `找到邮箱输入框: ${emailInput.tagName}[name="${
          emailInput.name || emailInput.id
        }"]`,
        "success"
      );

      // 清空并填写邮箱
      emailInput.value = "";
      emailInput.focus();

      // 逐字符输入，模拟真实用户行为
      for (let i = 0; i < email.length; i++) {
        emailInput.value = email.substring(0, i + 1);
        emailInput.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(50); // 每个字符间隔50ms
      }

      // 触发多种事件确保兼容性
      emailInput.dispatchEvent(new Event("change", { bubbles: true }));
      emailInput.dispatchEvent(new Event("blur", { bubbles: true }));

      log("邮箱填写完成", "success");

      // 步骤3: 第一次点击Continue按钮
      log("步骤3: 查找并点击Continue按钮提交邮箱", "info");
      await sleep(1000); // 等待页面响应

      const continueBtn = await wait($.continueBtn, 10000);
      if (!continueBtn) {
        throw new Error("未找到Continue按钮");
      }

      log(
        `找到按钮: "${continueBtn.textContent.trim()}" [${
          continueBtn.tagName
        }]`,
        "info"
      );

      // 确保按钮可点击
      if (continueBtn.disabled) {
        log("按钮当前被禁用，等待启用...", "warning");
        await sleep(2000);
      }

      // 模拟真实点击
      continueBtn.focus();
      await sleep(100);
      continueBtn.click();
      log("已点击Continue按钮，等待页面跳转", "success");

      // 步骤4: 等待页面跳转到验证码输入页面
      log("步骤4: 等待页面跳转到验证码输入页面", "info");
      await sleep(PAGE_TRANSITION_WAIT);

      // 步骤5: 查找验证码输入框
      log("步骤5: 查找验证码输入框", "info");
      const codeInput = await wait($.code, 10000);
      if (!codeInput) {
        throw new Error("未找到验证码输入框，可能页面未跳转");
      }

      log("找到验证码输入框", "success");

      // 显示手动输入按钮
      const manualBtn = statusPanel.querySelector("#manual-code-btn");
      if (manualBtn) {
        manualBtn.style.display = "inline-block";
      }

      // 步骤6: 自动获取验证码（带重试机制）
      log("步骤6: 开始获取验证码", "info");
      let verificationCode = null;

      for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          await sleep(RETRY_INTERVAL); // 等待邮件到达
          verificationCode = await getVerificationCode(email, attempt);
          break;
        } catch (error) {
          log(`第${attempt + 1}次获取失败: ${error.message}`, "error");
          if (attempt === MAX_RETRY_ATTEMPTS - 1) {
            log("自动获取验证码失败，请手动输入", "error");
            verificationCode = await showManualCodeInput();
          }
        }
      }

      if (!verificationCode) {
        throw new Error("未能获取验证码");
      }

      // 步骤7: 填写验证码
      log("步骤7: 填写验证码", "info");
      codeInput.value = "";
      codeInput.focus();

      // 逐字符输入验证码，模拟真实用户行为
      for (let i = 0; i < verificationCode.length; i++) {
        codeInput.value = verificationCode.substring(0, i + 1);
        codeInput.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(100); // 每个字符间隔100ms
      }

      // 触发事件
      codeInput.dispatchEvent(new Event("change", { bubbles: true }));
      codeInput.dispatchEvent(new Event("blur", { bubbles: true }));

      log(`验证码填写完成: ${verificationCode}`, "success");

      // 步骤8: 第二次点击Continue按钮完成注册
      log("步骤8: 查找并点击Continue按钮完成注册", "info");
      await sleep(1000);

      const finalContinueBtn = await wait($.continueBtn, 10000);
      if (!finalContinueBtn) {
        throw new Error("未找到最终的Continue按钮");
      }

      log(
        `找到最终按钮: "${finalContinueBtn.textContent.trim()}" [${
          finalContinueBtn.tagName
        }]`,
        "info"
      );

      // 确保按钮可点击
      if (finalContinueBtn.disabled) {
        log("最终按钮当前被禁用，等待启用...", "warning");
        await sleep(2000);
      }

      // 模拟真实点击
      finalContinueBtn.focus();
      await sleep(100);
      finalContinueBtn.click();
      log("已点击最终Continue按钮", "success");

      // 等待注册完成
      await sleep(2000);
      log("🎉 注册流程完成！", "success");

      // 隐藏手动输入按钮
      const finalManualBtn = statusPanel.querySelector("#manual-code-btn");
      if (finalManualBtn) {
        finalManualBtn.style.display = "none";
      }
    } catch (error) {
      log(`注册失败: ${error.message}`, "error");
      console.error("注册流程错误:", error);
    }
  }

  // 全局函数，供HTML调用
  if (typeof window !== "undefined") {
    window.startRegistration = startRegistration;
    window.showManualCodeInput = showManualCodeInput;
  }

  /* ---- CSS样式 ---- */
  GM_addStyle(`
    #augment-status-panel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 350px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border: 1px solid #e1e5e9;
    }

    .panel-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .title {
      font-weight: 600;
      font-size: 16px;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .close-btn:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }

    .status-bar {
      padding: 12px 20px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .status-bar.success {
      background-color: #f0f9ff;
      color: #0369a1;
      border-left: 4px solid #0ea5e9;
    }

    .status-bar.error {
      background-color: #fef2f2;
      color: #dc2626;
      border-left: 4px solid #ef4444;
    }

    .status-bar.info {
      background-color: #f8fafc;
      color: #475569;
      border-left: 4px solid #64748b;
    }

    .email-info {
      padding: 12px 20px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .refresh-email-btn {
      background: #e3f2fd;
      border: 1px solid #2196f3;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 12px;
      color: #1976d2;
      transition: all 0.2s;
    }

    .refresh-email-btn:hover {
      background: #bbdefb;
    }

    .email-label {
      color: #64748b;
      margin-right: 8px;
    }

    .email-value {
      color: #1e293b;
      font-weight: 500;
      word-break: break-all;
    }

    .action-buttons {
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      gap: 8px;
    }

    .start-btn, .manual-code-btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .start-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .start-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .manual-code-btn {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .manual-code-btn:hover {
      background: #f1f5f9;
    }

    .log-container {
      max-height: 200px;
      overflow: hidden;
    }

    .log-header {
      padding: 12px 20px;
      background: #f8fafc;
      color: #475569;
      font-size: 13px;
      font-weight: 500;
      border-bottom: 1px solid #e2e8f0;
    }

    .log-content {
      max-height: 160px;
      overflow-y: auto;
      padding: 8px 0;
    }

    .log-entry {
      padding: 6px 20px;
      font-size: 12px;
      border-left: 3px solid transparent;
    }

    .log-entry.success {
      color: #059669;
      background-color: #f0fdf4;
      border-left-color: #10b981;
    }

    .log-entry.error {
      color: #dc2626;
      background-color: #fef2f2;
      border-left-color: #ef4444;
    }

    .log-entry.info {
      color: #475569;
      background-color: #f8fafc;
      border-left-color: #64748b;
    }

    .manual-code-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    }

    .modal-content {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      text-align: center;
      max-width: 400px;
      width: 90%;
    }

    .modal-content h3 {
      margin: 0 0 16px 0;
      color: #1e293b;
    }

    .modal-content p {
      margin: 0 0 20px 0;
      color: #64748b;
      line-height: 1.5;
    }

    .code-input {
      width: 120px;
      padding: 12px;
      font-size: 18px;
      text-align: center;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 20px;
      letter-spacing: 4px;
    }

    .code-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .modal-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .confirm-btn, .cancel-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .confirm-btn {
      background: #667eea;
      color: white;
    }

    .confirm-btn:hover {
      background: #5a67d8;
    }

    .cancel-btn {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .cancel-btn:hover {
      background: #f1f5f9;
    }
  `);

  /* ---- 初始化 ---- */
  function init() {
    // 检查是否在目标页面
    const isTargetPage =
      window.location.href.includes("augmentcode.com") ||
      window.location.href.includes("login.augmentcode.com");

    if (isTargetPage) {
      log("检测到Augment页面，初始化自动注册工具", "info");
      createStatusPanel();

      // 生成邮箱地址（只生成一次）
      if (!currentEmail) {
        const email = randStr() + "@" + DOMAIN;
        currentEmail = email; // 确保全局变量同步设置
        updateEmailDisplay(email);
        log(`生成邮箱地址: ${email}`, "success");
      }

      // 检测页面类型
      const hasEmailInput = !!$.email();
      const hasCodeInput = !!$.code();

      if (hasEmailInput) {
        log("检测到邮箱输入页面", "success");
        updateStatus("📧", "检测到邮箱输入页面，可以开始注册", "success");
      } else if (hasCodeInput) {
        log("检测到验证码输入页面", "success");
        updateStatus("🔢", "检测到验证码输入页面", "success");
      } else {
        log("等待页面加载完成...", "info");
        updateStatus("⏳", "等待页面加载完成...", "info");
      }
    }
  }

  // 页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
