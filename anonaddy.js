// ==UserScript==
// @name        Augment 全自动注册 - 完全自动化版本
// @namespace   augment-auto-complete
// @version     7.0
// @description 一键完成Augment官网自动注册流程，无需人工干预
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
// @connect     your-project.vercel.app
// ==/UserScript==

(() => {
  "use strict";

  /* ======== 生产配置 ======== */
  // 🔧 请根据您的部署情况修改以下配置
  const API_URL = "https://augment-register.vercel.app/api/code"; // 修改为您的 Vercel 部署地址
  const DOMAIN = "zkllk.anonaddy.com"; // 修改为您的 AnonAddy 域名

  // 自动化配置
  const AUTO_START_DELAY = 5000; // 页面加载后自动开始延迟（毫秒）
  const MAX_RETRY_ATTEMPTS = 5; // 验证码获取最大重试次数
  const RETRY_INTERVAL = 3000; // 重试间隔（毫秒）
  const PAGE_TRANSITION_WAIT = 3000; // 页面跳转等待时间
  const CODE_FETCH_DELAY = 5000; // 验证码获取前等待时间
  const ELEMENT_WAIT_TIMEOUT = 10000; // 元素等待超时时间
  /* ======================== */

  // 全局变量
  let currentEmail = "";
  let isProcessing = false;
  let statusPanel = null;
  let autoMode = true; // 自动模式开关

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

  // 调试日志
  const debugLog = (message, type = "info") => {
    console.log(`[DEBUG] ${message}`);
  };

  /* ---- 增强的 DOM 选择器 ---- */
  const $ = {
    // 邮箱输入框 - 更全面的选择器
    email: () =>
      document.querySelector('input[name="username"]') ||
      document.querySelector('input[name="email"]') ||
      document.querySelector('input[id="email"]') ||
      document.querySelector('input[type="email"]') ||
      document.querySelector('input[inputmode="email"]') ||
      document.querySelector('input[placeholder*="email" i]') ||
      document.querySelector('input[placeholder*="邮箱"]') ||
      document.querySelector('input[placeholder*="Email"]') ||
      document.querySelector('input[autocomplete="email"]'),

    // 验证码输入框 - 更精确的匹配
    code: () =>
      document.querySelector('input[name="code"]') ||
      document.querySelector('input[name="otp"]') ||
      document.querySelector('input[name="verification_code"]') ||
      document.querySelector('input[name="verificationCode"]') ||
      document.querySelector('input[type="number"]') ||
      document.querySelector('input[maxlength="6"]') ||
      document.querySelector('input[placeholder*="验证码" i]') ||
      document.querySelector('input[placeholder*="code" i]') ||
      document.querySelector('input[placeholder*="verification" i]') ||
      document.querySelector('input[autocomplete="one-time-code"]'),

    // 提交按钮 - 智能识别
    submitBtn: () => {
      // 优先查找明确的提交按钮
      let btn =
        document.querySelector('button[type="submit"]') ||
        document.querySelector('input[type="submit"]');

      if (btn) return btn;

      // 查找包含特定文本的按钮
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => {
        const text = b.textContent.trim().toLowerCase();
        return (
          text.includes("continue") ||
          text.includes("next") ||
          text.includes("submit") ||
          text.includes("verify") ||
          text.includes("confirm") ||
          text.includes("继续") ||
          text.includes("下一步") ||
          text.includes("提交") ||
          text.includes("验证") ||
          text.includes("确认")
        );
      });
    },

    // 服务条款复选框
    agree: () =>
      document.querySelector('input[type="checkbox"]') ||
      document.querySelector('input[name*="agree" i]') ||
      document.querySelector('input[name*="terms" i]') ||
      document.querySelector('input[id*="terms"]') ||
      document.querySelector('input[id*="agree"]'),
  };

  /* ---- 智能等待元素 ---- */
  const waitForElement = (selector, timeout = ELEMENT_WAIT_TIMEOUT) => {
    return new Promise((resolve) => {
      // 立即检查
      const element =
        typeof selector === "function"
          ? selector()
          : document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      let timeoutId;
      const observer = new MutationObserver(() => {
        const element =
          typeof selector === "function"
            ? selector()
            : document.querySelector(selector);
        if (element) {
          clearTimeout(timeoutId);
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      timeoutId = setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  };

  /* ---- 验证码获取 ---- */
  const fetchVerificationCode = async (email) => {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url: API_URL,
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify({ email }),
        timeout: 30000,
        onload: (response) => {
          try {
            const data = JSON.parse(response.responseText);
            if (data.success && data.code) {
              log(`成功获取验证码: ${data.code}`, "success");
              resolve(data.code);
            } else {
              reject(new Error(data.message || "获取验证码失败"));
            }
          } catch (error) {
            reject(new Error("解析API响应失败"));
          }
        },
        onerror: () => reject(new Error("网络请求失败")),
        ontimeout: () => reject(new Error("请求超时")),
      });
    });
  };

  /* ---- 邮箱生成 ---- */
  const generateEmail = () => {
    const randomPart = randStr();
    return `augment-${randomPart}@${DOMAIN}`;
  };

  /* ---- 状态面板UI ---- */
  const createStatusPanel = () => {
    if (statusPanel) return;

    // 添加样式
    GM_addStyle(`
      #augment-auto-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        overflow: hidden;
      }
      
      .auto-panel-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .auto-panel-content {
        padding: 15px;
      }
      
      .auto-status-item {
        margin: 10px 0;
        padding: 10px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.4;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .auto-status-success { background: #d4edda; color: #155724; }
      .auto-status-error { background: #f8d7da; color: #721c24; }
      .auto-status-info { background: #d1ecf1; color: #0c5460; }
      .auto-status-warning { background: #fff3cd; color: #856404; }
      
      .auto-email-display {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        word-break: break-all;
        margin: 10px 0;
        border: 1px solid #e9ecef;
      }
      
      .auto-progress-bar {
        width: 100%;
        height: 6px;
        background: #e9ecef;
        border-radius: 3px;
        overflow: hidden;
        margin: 10px 0;
      }
      
      .auto-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      
      .auto-action-buttons {
        display: flex;
        gap: 8px;
        margin-top: 15px;
      }
      
      .auto-btn {
        flex: 1;
        padding: 10px 12px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
      }
      
      .auto-btn-primary {
        background: #007bff;
        color: white;
      }
      
      .auto-btn-primary:hover {
        background: #0056b3;
      }
      
      .auto-btn-primary:disabled {
        background: #6c757d;
        cursor: not-allowed;
      }
      
      .auto-btn-secondary {
        background: #6c757d;
        color: white;
      }
      
      .auto-btn-secondary:hover {
        background: #545b62;
      }
      
      .auto-minimize-btn {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .auto-minimize-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .auto-panel-minimized .auto-panel-content {
        display: none;
      }
      
      .auto-mode-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 10px 0;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 6px;
        font-size: 12px;
      }
      
      .auto-toggle-switch {
        position: relative;
        width: 40px;
        height: 20px;
        background: #ccc;
        border-radius: 10px;
        cursor: pointer;
        transition: background 0.3s;
      }
      
      .auto-toggle-switch.active {
        background: #007bff;
      }
      
      .auto-toggle-slider {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: white;
        border-radius: 50%;
        transition: transform 0.3s;
      }
      
      .auto-toggle-switch.active .auto-toggle-slider {
        transform: translateX(20px);
      }
    `);

    // 创建面板HTML
    statusPanel = document.createElement("div");
    statusPanel.id = "augment-auto-panel";
    statusPanel.innerHTML = `
      <div class="auto-panel-header">
        <span>🚀 Augment 全自动注册</span>
        <button class="auto-minimize-btn" onclick="this.closest('#augment-auto-panel').classList.toggle('auto-panel-minimized')">−</button>
      </div>
      <div class="auto-panel-content">
        <div class="auto-mode-toggle">
          <span>自动模式:</span>
          <div class="auto-toggle-switch ${
            autoMode ? "active" : ""
          }" id="auto-mode-toggle">
            <div class="auto-toggle-slider"></div>
          </div>
          <span id="auto-mode-text">${autoMode ? "开启" : "关闭"}</span>
        </div>
        
        <div id="auto-status-display" class="auto-status-item auto-status-info">
          ℹ️ 准备就绪，等待开始...
        </div>
        
        <div class="auto-progress-bar">
          <div class="auto-progress-fill" id="auto-progress-fill" style="width: 0%"></div>
        </div>
        
        <div id="auto-email-display" class="auto-email-display">
          邮箱地址: 等待生成...
        </div>
        
        <div class="auto-action-buttons">
          <button id="auto-start-btn" class="auto-btn auto-btn-primary">开始注册</button>
          <button id="auto-retry-btn" class="auto-btn auto-btn-secondary" style="display: none;">重试</button>
        </div>
      </div>
    `;

    document.body.appendChild(statusPanel);

    // 绑定事件
    document
      .getElementById("auto-start-btn")
      .addEventListener("click", startAutoRegistration);
    document.getElementById("auto-retry-btn").addEventListener("click", () => {
      document.getElementById("auto-retry-btn").style.display = "none";
      startAutoRegistration();
    });

    // 自动模式切换
    document
      .getElementById("auto-mode-toggle")
      .addEventListener("click", () => {
        autoMode = !autoMode;
        const toggle = document.getElementById("auto-mode-toggle");
        const text = document.getElementById("auto-mode-text");

        if (autoMode) {
          toggle.classList.add("active");
          text.textContent = "开启";
        } else {
          toggle.classList.remove("active");
          text.textContent = "关闭";
        }
      });
  };

  // 更新状态显示
  const updateStatus = (icon, message, type = "info") => {
    const statusDisplay = document.getElementById("auto-status-display");
    if (statusDisplay) {
      statusDisplay.className = `auto-status-item auto-status-${type}`;
      statusDisplay.innerHTML = `${icon} ${message}`;
    }
  };

  // 更新邮箱显示
  const updateEmailDisplay = (email) => {
    const emailDisplay = document.getElementById("auto-email-display");
    if (emailDisplay) {
      emailDisplay.innerHTML = `邮箱地址: <strong>${email}</strong>`;
    }
  };

  // 更新进度条
  const updateProgress = (percentage) => {
    const progressFill = document.getElementById("auto-progress-fill");
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
  };

  // 显示重试按钮
  const showRetryButton = () => {
    const retryBtn = document.getElementById("auto-retry-btn");
    const startBtn = document.getElementById("auto-start-btn");
    if (retryBtn && startBtn) {
      retryBtn.style.display = "block";
      startBtn.disabled = false;
      startBtn.textContent = "开始注册";
    }
  };

  /* ---- 核心自动化流程 ---- */

  // 步骤1: 自动填写邮箱
  const autoFillEmail = async () => {
    try {
      log("🔍 查找邮箱输入框...", "info");
      updateProgress(10);

      const emailInput = await waitForElement($.email, ELEMENT_WAIT_TIMEOUT);
      if (!emailInput) {
        throw new Error("未找到邮箱输入框");
      }

      log("📧 找到邮箱输入框，开始填写...", "success");
      debugLog(
        `邮箱输入框属性: name="${emailInput.name}", type="${emailInput.type}", placeholder="${emailInput.placeholder}"`
      );

      // 清空并填写邮箱
      emailInput.value = "";
      emailInput.focus();
      await sleep(500);

      // 模拟真实输入
      for (let i = 0; i < currentEmail.length; i++) {
        emailInput.value += currentEmail[i];
        emailInput.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(50); // 模拟打字速度
      }

      // 触发各种事件确保兼容性
      emailInput.dispatchEvent(new Event("change", { bubbles: true }));
      emailInput.dispatchEvent(new Event("blur", { bubbles: true }));

      log(`✅ 邮箱填写完成: ${currentEmail}`, "success");
      updateProgress(25);

      return true;
    } catch (error) {
      log(`❌ 邮箱填写失败: ${error.message}`, "error");
      throw error;
    }
  };

  // 步骤2: 自动点击提交按钮
  const autoSubmitEmail = async () => {
    try {
      log("🔍 查找提交按钮...", "info");
      await sleep(1000); // 等待页面响应

      const submitBtn = await waitForElement($.submitBtn, ELEMENT_WAIT_TIMEOUT);
      if (!submitBtn) {
        throw new Error("未找到提交按钮");
      }

      log("🎯 找到提交按钮，准备提交...", "success");
      debugLog(
        `提交按钮属性: type="${
          submitBtn.type
        }", textContent="${submitBtn.textContent.trim()}"`
      );

      // 确保按钮可点击
      if (submitBtn.disabled) {
        log("⚠️ 按钮被禁用，等待启用...", "warning");
        await sleep(2000);
      }

      submitBtn.click();
      log("✅ 邮箱已提交，等待页面跳转...", "success");
      updateProgress(40);

      return true;
    } catch (error) {
      log(`❌ 提交失败: ${error.message}`, "error");
      throw error;
    }
  };

  // 步骤3: 等待验证码页面并获取验证码
  const autoGetVerificationCode = async (skipPageWait = false) => {
    try {
      if (!skipPageWait) {
        log("⏳ 等待验证码页面加载...", "info");
        await sleep(PAGE_TRANSITION_WAIT);
      }

      log("🔍 查找验证码输入框...", "info");
      const codeInput = await waitForElement($.code, ELEMENT_WAIT_TIMEOUT);
      if (!codeInput) {
        throw new Error("未找到验证码输入框，可能页面未跳转");
      }

      log("✅ 验证码页面已加载", "success");
      updateProgress(55);

      // 等待邮件到达
      log(`⏳ 等待 ${CODE_FETCH_DELAY / 1000} 秒让邮件到达...`, "info");
      await sleep(CODE_FETCH_DELAY);
      updateProgress(65);

      let verificationCode = null;

      // 多次尝试获取验证码
      for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          log(`🔄 第 ${attempt} 次尝试获取验证码...`, "info");
          verificationCode = await fetchVerificationCode(currentEmail);
          break;
        } catch (error) {
          log(`❌ 第 ${attempt} 次获取失败: ${error.message}`, "error");

          if (attempt < MAX_RETRY_ATTEMPTS) {
            log(`⏳ 等待 ${RETRY_INTERVAL / 1000} 秒后重试...`, "info");
            await sleep(RETRY_INTERVAL);
          } else {
            throw new Error(`多次尝试后仍无法获取验证码: ${error.message}`);
          }
        }
      }

      if (!verificationCode) {
        throw new Error("获取验证码失败");
      }

      updateProgress(80);
      return { codeInput, verificationCode };
    } catch (error) {
      log(`❌ 验证码获取失败: ${error.message}`, "error");
      throw error;
    }
  };

  // 步骤4: 自动填写验证码并提交
  const autoFillAndSubmitCode = async (codeInput, verificationCode) => {
    try {
      log(`📝 开始填写验证码: ${verificationCode}`, "info");

      // 清空并填写验证码
      codeInput.value = "";
      codeInput.focus();
      await sleep(500);

      // 模拟真实输入验证码
      for (let i = 0; i < verificationCode.length; i++) {
        codeInput.value += verificationCode[i];
        codeInput.dispatchEvent(new Event("input", { bubbles: true }));
        await sleep(100); // 稍慢的输入速度
      }

      // 触发事件
      codeInput.dispatchEvent(new Event("change", { bubbles: true }));
      codeInput.dispatchEvent(new Event("blur", { bubbles: true }));

      log("✅ 验证码填写完成", "success");
      await sleep(1000);

      // 查找并点击提交按钮
      log("🔍 查找验证码提交按钮...", "info");
      const submitBtn = await waitForElement($.submitBtn, ELEMENT_WAIT_TIMEOUT);
      if (!submitBtn) {
        throw new Error("未找到验证码提交按钮");
      }

      log("🎯 提交验证码...", "success");
      submitBtn.click();
      updateProgress(90);

      return true;
    } catch (error) {
      log(`❌ 验证码提交失败: ${error.message}`, "error");
      throw error;
    }
  };

  // 步骤5: 处理服务条款页面
  const autoHandleTerms = async () => {
    try {
      log("⏳ 检查是否有服务条款页面...", "info");
      await sleep(PAGE_TRANSITION_WAIT);

      const agreeCheckbox = await waitForElement($.agree, 3000); // 较短的等待时间
      if (agreeCheckbox && !agreeCheckbox.checked) {
        log("☑️ 找到服务条款，自动同意...", "info");
        agreeCheckbox.click();
        await sleep(1000);

        // 查找最终提交按钮
        const finalSubmitBtn = await waitForElement(
          $.submitBtn,
          ELEMENT_WAIT_TIMEOUT
        );
        if (finalSubmitBtn) {
          log("🎯 提交服务条款...", "success");
          finalSubmitBtn.click();
        }
      }

      updateProgress(100);
      return true;
    } catch (error) {
      // 服务条款页面是可选的，不抛出错误
      log("ℹ️ 未发现服务条款页面，可能已完成注册", "info");
      updateProgress(100);
      return true;
    }
  };

  // 继续验证码流程（从验证码页面开始）
  const continueVerificationCodeFlow = async () => {
    if (isProcessing) {
      log("⚠️ 流程正在进行中，请勿重复启动", "warning");
      return;
    }

    isProcessing = true;
    const startBtn = document.getElementById("auto-start-btn");
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "处理中...";
    }

    try {
      // 确保有邮箱地址
      if (!currentEmail) {
        currentEmail = generateEmail();
        updateEmailDisplay(currentEmail);
        log(`📧 生成邮箱地址: ${currentEmail}`, "success");
      }

      log("🔢 从验证码页面继续流程", "info");
      updateProgress(50);

      // 步骤3: 获取验证码（跳过页面等待，因为已经在验证码页面）
      const { codeInput, verificationCode } = await autoGetVerificationCode(
        true
      );

      // 步骤4: 填写并提交验证码
      await autoFillAndSubmitCode(codeInput, verificationCode);

      // 步骤5: 处理服务条款（可选）
      await autoHandleTerms();

      // 完成
      log("🎉 注册流程完成！", "success");
      updateStatus("🎉", "注册流程完成！恭喜您成功注册！", "success");
    } catch (error) {
      log(`❌ 验证码流程失败: ${error.message}`, "error");
      updateStatus("❌", `验证码流程失败: ${error.message}`, "error");
      showRetryButton();
    } finally {
      isProcessing = false;
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = "开始注册";
      }
    }
  };

  // 继续服务条款流程（从服务条款页面开始）
  const continueTermsFlow = async () => {
    if (isProcessing) {
      log("⚠️ 流程正在进行中，请勿重复启动", "warning");
      return;
    }

    isProcessing = true;
    const startBtn = document.getElementById("auto-start-btn");
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "处理中...";
    }

    try {
      log("📋 从服务条款页面继续流程", "info");
      updateProgress(90);

      // 步骤5: 处理服务条款
      await autoHandleTerms();

      // 完成
      log("🎉 注册流程完成！", "success");
      updateStatus("🎉", "注册流程完成！恭喜您成功注册！", "success");
    } catch (error) {
      log(`❌ 服务条款流程失败: ${error.message}`, "error");
      updateStatus("❌", `服务条款流程失败: ${error.message}`, "error");
      showRetryButton();
    } finally {
      isProcessing = false;
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = "开始注册";
      }
    }
  };

  // 主自动化流程
  const startAutoRegistration = async () => {
    if (isProcessing) {
      log("⚠️ 注册流程正在进行中，请勿重复点击", "warning");
      return;
    }

    isProcessing = true;
    const startBtn = document.getElementById("auto-start-btn");
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "处理中...";
    }

    try {
      // 生成邮箱（如果还没有）
      if (!currentEmail) {
        currentEmail = generateEmail();
        updateEmailDisplay(currentEmail);
        log(`📧 生成邮箱地址: ${currentEmail}`, "success");
      }

      updateProgress(5);
      log("🚀 开始全自动注册流程...", "info");

      // 步骤1: 填写邮箱
      await autoFillEmail();

      // 步骤2: 提交邮箱
      await autoSubmitEmail();

      // 步骤3: 获取验证码
      const { codeInput, verificationCode } = await autoGetVerificationCode();

      // 步骤4: 填写并提交验证码
      await autoFillAndSubmitCode(codeInput, verificationCode);

      // 步骤5: 处理服务条款（可选）
      await autoHandleTerms();

      // 完成
      log("🎉 注册流程完成！", "success");
      updateStatus("🎉", "注册流程完成！恭喜您成功注册！", "success");
    } catch (error) {
      log(`❌ 自动注册失败: ${error.message}`, "error");
      updateStatus("❌", `注册失败: ${error.message}`, "error");
      showRetryButton();
    } finally {
      isProcessing = false;
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = "开始注册";
      }
    }
  };

  /* ---- 页面检测和初始化 ---- */

  // 检测页面类型
  const detectPageType = () => {
    const hasEmailInput = !!$.email();
    const hasCodeInput = !!$.code();
    const hasAgreeCheckbox = !!$.agree();

    if (hasEmailInput) {
      return "email";
    } else if (hasCodeInput) {
      return "code";
    } else if (hasAgreeCheckbox) {
      return "terms";
    } else {
      return "unknown";
    }
  };

  // 智能页面检测和自动启动
  const smartAutoStart = async () => {
    if (!autoMode) return;

    const pageType = detectPageType();

    if (pageType === "email") {
      log("🤖 检测到邮箱页面，自动模式启动中...", "info");
      await sleep(AUTO_START_DELAY);

      if (autoMode && !isProcessing) {
        log("🚀 自动模式启动注册流程", "success");
        startAutoRegistration();
      }
    }
  };

  // 初始化函数
  const init = () => {
    // 检查是否在目标页面
    const isTargetPage =
      window.location.href.includes("augmentcode.com") ||
      window.location.href.includes("login.augmentcode.com");

    if (!isTargetPage) {
      return;
    }

    log("🔍 检测到Augment页面，初始化全自动注册工具", "info");

    // 创建状态面板
    createStatusPanel();

    // 生成邮箱地址（只生成一次）
    if (!currentEmail) {
      currentEmail = generateEmail();
      updateEmailDisplay(currentEmail);
      log(`📧 生成邮箱地址: ${currentEmail}`, "success");
    }

    // 检测页面类型并更新状态
    const pageType = detectPageType();

    switch (pageType) {
      case "email":
        log("📧 检测到邮箱输入页面", "success");
        updateStatus("📧", "检测到邮箱输入页面，准备开始注册", "success");

        // 自动模式下延迟启动
        if (autoMode) {
          updateStatus(
            "🤖",
            `自动模式已开启，${AUTO_START_DELAY / 1000}秒后自动开始`,
            "info"
          );
          smartAutoStart();
        }
        break;

      case "code":
        log("🔢 检测到验证码输入页面，自动继续流程", "success");
        updateStatus("🔢", "检测到验证码输入页面，自动获取验证码", "success");

        // 自动继续验证码流程
        setTimeout(async () => {
          if (!isProcessing) {
            log("🤖 自动继续验证码流程", "info");
            await continueVerificationCodeFlow();
          }
        }, 1000);
        break;

      case "terms":
        log("📋 检测到服务条款页面，自动处理", "success");
        updateStatus("📋", "检测到服务条款页面，自动完成注册", "success");

        // 自动处理服务条款
        setTimeout(async () => {
          if (!isProcessing) {
            log("🤖 自动处理服务条款", "info");
            await continueTermsFlow();
          }
        }, 1000);
        break;

      default:
        log("⏳ 等待页面加载完成...", "info");
        updateStatus("⏳", "等待页面加载完成...", "info");

        // 设置页面变化监听
        const observer = new MutationObserver(() => {
          const newPageType = detectPageType();
          if (newPageType !== "unknown") {
            observer.disconnect();
            log(`🔄 页面类型变化为: ${newPageType}`, "info");
            setTimeout(init, 1000); // 重新初始化
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        // 定期检查页面变化（备用机制）
        const checkInterval = setInterval(() => {
          const newPageType = detectPageType();
          if (newPageType !== "unknown") {
            clearInterval(checkInterval);
            observer.disconnect();
            log(`🔄 定期检查发现页面类型: ${newPageType}`, "info");
            setTimeout(init, 1000);
          }
        }, 2000);

        // 10秒后停止检查
        setTimeout(() => {
          clearInterval(checkInterval);
          observer.disconnect();
          log("⏰ 页面检查超时，停止监听", "info");
        }, 10000);
        break;
    }
  };

  // 页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // 延迟初始化，确保页面完全加载
    setTimeout(init, 1000);
  }

  // 监听页面变化（SPA应用）
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      log("🔄 检测到页面变化，重新初始化", "info");
      setTimeout(init, 2000); // 页面变化后重新初始化
    }
  }).observe(document, { subtree: true, childList: true });

  // 键盘快捷键支持
  document.addEventListener("keydown", (e) => {
    // Ctrl+Shift+A 快速启动
    if (e.ctrlKey && e.shiftKey && e.key === "A") {
      e.preventDefault();
      if (!isProcessing) {
        log("⌨️ 快捷键启动注册流程", "info");
        startAutoRegistration();
      }
    }

    // Ctrl+Shift+T 切换自动模式
    if (e.ctrlKey && e.shiftKey && e.key === "T") {
      e.preventDefault();
      const toggle = document.getElementById("auto-mode-toggle");
      if (toggle) {
        toggle.click();
        log(`⌨️ 快捷键切换自动模式: ${autoMode ? "开启" : "关闭"}`, "info");
      }
    }
  });

  // 页面可见性变化监听
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && autoMode) {
      // 页面重新可见时，检查是否需要重新启动
      setTimeout(() => {
        const pageType = detectPageType();
        if (pageType === "email" && !isProcessing) {
          log("👁️ 页面重新可见，检查自动启动条件", "info");
          smartAutoStart();
        }
      }, 1000);
    }
  });

  // 全局错误处理
  window.addEventListener("error", (e) => {
    log(`💥 全局错误: ${e.message}`, "error");
    console.error("Augment Auto Registration Error:", e);
  });

  // 初始化完成提示
  log("🎯 Augment 全自动注册脚本已加载", "success");
  console.log("🚀 Augment 全自动注册脚本 v7.0");
  console.log(
    "⌨️ 快捷键: Ctrl+Shift+A (启动注册) | Ctrl+Shift+T (切换自动模式)"
  );
})();
