// ==UserScript==
// @name         AugmentCode自动注册
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  自动完成AugmentCode的注册流程
// @author       Zk
// @match        https://*.augmentcode.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=augmentcode.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// @connect      api.guerrillamail.com
// ==/UserScript==

(function () {
  "use strict";

  // 创建日志UI
  function createLogUI() {
    const logContainer = document.createElement("div");
    logContainer.innerHTML = `
          <div id="auto-register-log" style="
              position: fixed;
              bottom: 40px;
              right: 20px;
              width: 300px;
              max-height: 400px;
              background: rgba(255, 255, 255, 0.95);
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
              z-index: 10000;
              font-family: Arial, sans-serif;
              overflow: hidden;
              display: flex;
              flex-direction: column;
          ">
              <div style="
                  padding: 12px;
                  background: #1a73e8;
                  color: white;
                  font-weight: bold;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
              ">
                  <span>自动注册日志</span>
                  <div>
                      <button id="auto-register-btn" style="
                          background: #34a853;
                          border: none;
                          color: white;
                          cursor: pointer;
                          font-size: 12px;
                          padding: 4px 8px;
                          border-radius: 4px;
                          margin-right: 8px;
                          display: none;
                      ">开始注册</button>
                      <button id="clear-log" style="
                          background: transparent;
                          border: none;
                          color: white;
                          cursor: pointer;
                          font-size: 12px;
                          padding: 4px 8px;
                          border-radius: 4px;
                      ">清除</button>
                      <button id="minimize-log" style="
                          background: transparent;
                          border: none;
                          color: white;
                          cursor: pointer;
                          font-size: 14px;
                          padding: 4px 8px;
                          margin-left: 8px;
                      ">_</button>
                  </div>
              </div>
              <div style="
                  padding: 8px 12px;
                  background: #f8f9fa;
                  border-bottom: 1px solid #e8eaed;
                  font-size: 12px;
                  color: #5f6368;
                  display: flex;
                  align-items: center;
                  gap: 8px;
              ">
                  <span style="color: #1a73e8;">📢</span>
                  <span>关注公众号「code 未来」获取更多技术资源</span>
              </div>
              <div id="status-bar" style="
                  padding: 8px 12px;
                  background: #e8f0fe;
                  border-bottom: 1px solid #dadce0;
                  font-size: 11px;
                  color: #1a73e8;
                  display: flex;
                  align-items: center;
                  gap: 8px;
              ">
                  <span id="status-icon">🔍</span>
                  <span id="status-text">正在检测页面状态...</span>
              </div>
              <div id="log-content" style="
                  padding: 12px;
                  overflow-y: auto;
                  max-height: 300px;
                  font-size: 13px;
              "></div>
          </div>
      `;

    document.body.appendChild(logContainer);

    // 最小化功能
    let isMinimized = false;
    const logContent = document.getElementById("log-content");
    const minimizeBtn = document.getElementById("minimize-log");

    minimizeBtn.addEventListener("click", () => {
      isMinimized = !isMinimized;
      logContent.style.display = isMinimized ? "none" : "block";
      minimizeBtn.textContent = isMinimized ? "□" : "_";
    });

    // 清除日志功能
    const clearBtn = document.getElementById("clear-log");
    clearBtn.addEventListener("click", () => {
      logContent.innerHTML = "";
    });

    return {
      log: function (message, type = "info") {
        const logEntry = document.createElement("div");
        logEntry.style.marginBottom = "8px";
        logEntry.style.padding = "8px";
        logEntry.style.borderRadius = "4px";
        logEntry.style.wordBreak = "break-word";

        switch (type) {
          case "success":
            logEntry.style.background = "#e6f4ea";
            logEntry.style.color = "#1e8e3e";
            break;
          case "error":
            logEntry.style.background = "#fce8e6";
            logEntry.style.color = "#d93025";
            break;
          case "warning":
            logEntry.style.background = "#fef7e0";
            logEntry.style.color = "#ea8600";
            break;
          default:
            logEntry.style.background = "#f8f9fa";
            logEntry.style.color = "#202124";
        }

        const time = new Date().toLocaleTimeString();
        logEntry.textContent = `[${time}] ${message}`;
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
      },
      showRegisterButton: function () {
        const registerBtn = document.getElementById("auto-register-btn");
        if (registerBtn) {
          debugLog("✅ 找到注册按钮，正在显示...", "success");
          registerBtn.style.display = "inline-block";
          return registerBtn;
        } else {
          debugLog("❌ 未找到注册按钮元素", "error");
          return null;
        }
      },
      updateStatus: function (icon, text, type = "info") {
        const statusIcon = document.getElementById("status-icon");
        const statusText = document.getElementById("status-text");
        const statusBar = document.getElementById("status-bar");

        if (statusIcon && statusText && statusBar) {
          statusIcon.textContent = icon;
          statusText.textContent = text;

          // 根据类型设置状态栏颜色
          switch (type) {
            case "success":
              statusBar.style.background = "#e6f4ea";
              statusBar.style.color = "#1e8e3e";
              break;
            case "error":
              statusBar.style.background = "#fce8e6";
              statusBar.style.color = "#d93025";
              break;
            case "warning":
              statusBar.style.background = "#fef7e0";
              statusBar.style.color = "#ea8600";
              break;
            default:
              statusBar.style.background = "#e8f0fe";
              statusBar.style.color = "#1a73e8";
          }
        }
      },
    };
  }

  // 创建全局日志对象
  const logger = createLogUI();

  // 用户关心的关键信息日志
  function userLog(message, type = "info") {
    // 只输出用户关心的信息到UI
    logger.log(message, type);
  }

  // 详细调试日志（仅控制台）
  function debugLog(message, type = "info", data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;

    // 只输出到控制台，不干扰UI
    console.log(`%c${logMessage}`, `color: ${getConsoleColor(type)}`);
    if (data) {
      console.log("详细数据:", data);
    }
  }

  function getConsoleColor(type) {
    switch (type) {
      case "success":
        return "#1e8e3e";
      case "error":
        return "#d93025";
      case "warning":
        return "#ea8600";
      default:
        return "#1a73e8";
    }
  }

  // 配置 - 使用 GuerrillaMail API
  const GUERRILLA_MAIL_CONFIG = {
    apiUrl: "https://api.guerrillamail.com/ajax.php  ",
    domains: [
      "guerrillamail.com",
      "guerrillamail.net",
      "guerrillamail.biz",
      "guerrillamail.org",
    ],
    sessionId: null,
    currentEmail: null,
    emailTimestamp: null,
  };

  // 获取GuerrillaMail临时邮箱
  async function getGuerrillaEmail() {
    debugLog("🚀 开始获取GuerrillaMail临时邮箱", "info");

    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        f: "get_email_address",
        ip: "127.0.0.1",
        agent: navigator.userAgent.substring(0, 160),
        lang: "en",
      });

      const requestUrl = `${GUERRILLA_MAIL_CONFIG.apiUrl}?${params.toString()}`;
      debugLog("📤 发送邮箱获取请求", "info", {
        url: requestUrl,
        params: Object.fromEntries(params),
      });

      GM_xmlhttpRequest({
        method: "GET",
        url: requestUrl,
        onload: function (response) {
          debugLog("📥 收到邮箱API响应", "info", {
            status: response.status,
            statusText: response.statusText,
            responseLength: response.responseText.length,
          });

          try {
            debugLog(
              "📄 邮箱API原始响应",
              "info",
              response.responseText.substring(0, 500)
            );

            const data = JSON.parse(response.responseText);
            debugLog("📊 解析后的邮箱数据", "info", data);

            if (data.email_addr) {
              GUERRILLA_MAIL_CONFIG.currentEmail = data.email_addr;
              GUERRILLA_MAIL_CONFIG.emailTimestamp = data.email_timestamp;

              // 提取并保存session ID - 改进Cookie提取
              const responseHeaders = response.responseHeaders || "";
              debugLog(
                "🍪 响应头信息",
                "info",
                responseHeaders.substring(0, 500)
              );

              const cookieMatch = responseHeaders.match(
                /Set-Cookie:\s*PHPSESSID=([^;\s]+)/i
              );
              if (cookieMatch && cookieMatch[1]) {
                GUERRILLA_MAIL_CONFIG.sessionId = cookieMatch[1];
                debugLog(`✅ 提取到Session ID: ${cookieMatch[1]}`, "success");
              } else {
                debugLog("⚠️ 未找到Session ID，将使用无Session模式", "warning");
              }

              userLog(`✅ 获取临时邮箱: ${data.email_addr}`, "success");
              debugLog(`⏰ 邮箱时间戳: ${data.email_timestamp}`, "info");
              debugLog("📋 当前配置状态", "info", GUERRILLA_MAIL_CONFIG);
              resolve(data.email_addr);
            } else {
              debugLog("❌ API响应中没有邮箱地址", "error", data);
              reject(new Error("无法获取邮箱地址"));
            }
          } catch (error) {
            debugLog("❌ 解析邮箱响应失败", "error", {
              error: error.message,
              response: response.responseText,
            });
            reject(error);
          }
        },
        onerror: function (error) {
          debugLog("❌ 获取邮箱网络请求失败", "error", error);
          reject(error);
        },
      });
    });
  }

  // 等待元素出现
  async function waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return null;
  }

  // 从邮件文本中提取验证码
  function extractVerificationCode(mailText) {
    const codeMatch = mailText.match(/(?<![a-zA-Z@.])\b\d{6}\b/);
    return codeMatch ? codeMatch[0] : null;
  }

  // 检查GuerrillaMail邮箱中的新邮件
  async function checkGuerrillaEmail() {
    debugLog("📬 开始检查邮箱中的新邮件", "info");

    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        f: "check_email",
        ip: "127.0.0.1",
        agent: navigator.userAgent.substring(0, 160),
        seq: "0",
      });

      const headers = {};
      if (GUERRILLA_MAIL_CONFIG.sessionId) {
        headers.Cookie = `PHPSESSID=${GUERRILLA_MAIL_CONFIG.sessionId}`;
        debugLog(
          `🍪 使用Session ID: ${GUERRILLA_MAIL_CONFIG.sessionId}`,
          "info"
        );
      } else {
        debugLog("⚠️ 无Session ID，使用无状态模式", "warning");
      }

      const requestUrl = `${GUERRILLA_MAIL_CONFIG.apiUrl}?${params.toString()}`;
      debugLog("📤 发送检查邮件请求", "info", {
        url: requestUrl,
        params: Object.fromEntries(params),
        headers: headers,
      });

      GM_xmlhttpRequest({
        method: "GET",
        url: requestUrl,
        headers: headers,
        onload: function (response) {
          debugLog("📥 收到检查邮件API响应", "info", {
            status: response.status,
            statusText: response.statusText,
            responseLength: response.responseText.length,
          });

          try {
            debugLog(
              "📄 检查邮件API原始响应",
              "info",
              response.responseText.substring(0, 500)
            );

            const data = JSON.parse(response.responseText);
            debugLog("📊 解析后的邮件数据", "info", data);

            // 检查是否有邮箱信息
            if (data.email) {
              debugLog(`📧 当前邮箱: ${data.email}`, "info");
            }

            if (data.list && data.list.length > 0) {
              // 找到最新的邮件
              const latestMail = data.list[0];
              userLog(`📬 找到新邮件: ${latestMail.mail_subject}`, "success");
              debugLog(`📨 最新邮件详情`, "success", {
                subject: latestMail.mail_subject,
                from: latestMail.mail_from,
                id: latestMail.mail_id,
                timestamp: latestMail.mail_timestamp,
                excerpt: latestMail.mail_excerpt,
              });
              resolve(latestMail.mail_id);
            } else {
              userLog("📭 等待邮件到达...", "info");
              debugLog("📭 暂无新邮件", "info");
              resolve(null);
            }
          } catch (error) {
            debugLog("❌ 解析邮件列表失败", "error", {
              error: error.message,
              response: response.responseText,
            });
            resolve(null);
          }
        },
        onerror: function (error) {
          debugLog("❌ 检查邮件网络请求失败", "error", error);
          resolve(null);
        },
      });
    });
  }

  // 获取邮件内容并提取验证码
  async function fetchEmailContent(emailId) {
    debugLog(`📖 开始获取邮件内容 (ID: ${emailId})`, "info");

    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        f: "fetch_email",
        ip: "127.0.0.1",
        agent: navigator.userAgent.substring(0, 160),
        email_id: emailId,
      });

      const headers = {};
      if (GUERRILLA_MAIL_CONFIG.sessionId) {
        headers.Cookie = `PHPSESSID=${GUERRILLA_MAIL_CONFIG.sessionId}`;
        debugLog(`🍪 使用Session ID获取邮件内容`, "info");
      }

      const requestUrl = `${GUERRILLA_MAIL_CONFIG.apiUrl}?${params.toString()}`;
      debugLog("📤 发送获取邮件内容请求", "info", {
        url: requestUrl,
        params: Object.fromEntries(params),
        headers: headers,
      });

      GM_xmlhttpRequest({
        method: "GET",
        url: requestUrl,
        headers: headers,
        onload: function (response) {
          debugLog("📥 收到邮件内容API响应", "info", {
            status: response.status,
            statusText: response.statusText,
            responseLength: response.responseText.length,
          });

          try {
            debugLog(
              "📄 邮件内容API原始响应",
              "info",
              response.responseText.substring(0, 800)
            );

            const data = JSON.parse(response.responseText);
            debugLog("📊 解析后的邮件内容数据", "info", data);

            if (data.mail_body) {
              const mailText = data.mail_body;
              const mailSubject = data.mail_subject || "无主题";

              debugLog(`📧 邮件主题: ${mailSubject}`, "info");
              debugLog(
                `📝 邮件内容预览: ${mailText.substring(0, 300)}...`,
                "info"
              );
              debugLog(`📏 邮件内容长度: ${mailText.length} 字符`, "info");

              // 尝试多种验证码提取模式
              debugLog("🔍 开始提取验证码...", "info");
              let code = extractVerificationCode(mailText);
              debugLog(`🔍 第一种模式结果: ${code || "未找到"}`, "info");

              // 如果第一种模式失败，尝试其他模式
              if (!code) {
                debugLog("🔍 尝试HTML标签模式...", "info");
                const htmlCodeMatch = mailText.match(/>\s*(\d{6})\s*</);
                if (htmlCodeMatch) {
                  code = htmlCodeMatch[1];
                  debugLog(`🔍 HTML标签模式结果: ${code}`, "info");
                }
              }

              if (!code) {
                debugLog("🔍 尝试宽松匹配模式...", "info");
                const looseMatch = mailText.match(/\d{6}/);
                if (looseMatch) {
                  code = looseMatch[0];
                  debugLog(`🔍 宽松匹配模式结果: ${code}`, "info");
                }
              }

              if (code) {
                userLog(`🔢 获取验证码: ${code}`, "success");
                debugLog(`✅ 成功从邮件中提取到验证码: ${code}`, "success");
                resolve(code);
              } else {
                userLog("❌ 邮件中未找到验证码", "warning");
                debugLog("❌ 邮件中未找到验证码", "warning");
                debugLog("📄 完整邮件内容", "warning", mailText);
                resolve(null);
              }
            } else {
              debugLog("❌ 邮件响应中没有邮件内容", "error", data);
              resolve(null);
            }
          } catch (error) {
            debugLog("❌ 解析邮件内容失败", "error", {
              error: error.message,
              response: response.responseText,
            });
            resolve(null);
          }
        },
        onerror: function (error) {
          debugLog("❌ 获取邮件内容网络请求失败", "error", error);
          resolve(null);
        },
      });
    });
  }

  // 获取最新邮件中的验证码 - 使用GuerrillaMail
  async function getLatestMailCode() {
    try {
      const emailId = await checkGuerrillaEmail();
      if (emailId) {
        const code = await fetchEmailContent(emailId);
        return code;
      }
      return null;
    } catch (error) {
      debugLog("❌ 获取验证码失败", "error", error);
      return null;
    }
  }

  // 手动输入验证码的备用方案
  async function promptForVerificationCode() {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 99999;
          display: flex;
          justify-content: center;
          align-items: center;
        ">
          <div style="
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            text-align: center;
          ">
            <h3>请输入验证码</h3>
            <p>请检查邮箱 <strong>${
              GUERRILLA_MAIL_CONFIG.currentEmail || "临时邮箱"
            }</strong> 并输入收到的6位验证码：</p>
            <input type="text" id="manual-code-input" maxlength="6" style="
              padding: 10px;
              font-size: 16px;
              border: 2px solid #ddd;
              border-radius: 4px;
              text-align: center;
              letter-spacing: 2px;
              margin: 10px 0;
            " placeholder="000000">
            <br>
            <button id="confirm-code" style="
              background: #1a73e8;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              margin-right: 10px;
            ">确认</button>
            <button id="cancel-code" style="
              background: #ccc;
              color: black;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
            ">取消</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const input = document.getElementById("manual-code-input");
      const confirmBtn = document.getElementById("confirm-code");
      const cancelBtn = document.getElementById("cancel-code");

      input.focus();

      confirmBtn.onclick = () => {
        const code = input.value.trim();
        if (code.length === 6 && /^\d{6}$/.test(code)) {
          document.body.removeChild(modal);
          resolve(code);
        } else {
          alert("请输入6位数字验证码");
        }
      };

      cancelBtn.onclick = () => {
        document.body.removeChild(modal);
        resolve(null);
      };

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          confirmBtn.click();
        }
      });
    });
  }

  // 获取验证码（带重试机制和手动输入备用方案）
  async function getVerificationCode(maxRetries = 5, retryInterval = 5000) {
    debugLog("🎯 开始获取验证码流程...", "info");

    // 首先等待一段时间让邮件到达
    userLog("⏳ 等待邮件到达...", "info");
    debugLog("⏳ 等待邮件到达 (5秒)...", "info");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 首先尝试自动获取
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      debugLog(
        `🔄 尝试自动获取验证码 (第 ${attempt + 1}/${maxRetries} 次)...`,
        "info"
      );

      try {
        const code = await getLatestMailCode();
        if (code) {
          userLog(`✅ 自动获取验证码: ${code}`, "success");
          debugLog(`✅ 成功自动获取验证码: ${code}`, "success");
          return code;
        }

        if (attempt < maxRetries - 1) {
          userLog(
            `⏳ 第${attempt + 1}次未获取到验证码，${
              retryInterval / 1000
            }秒后重试...`,
            "warning"
          );
          debugLog(
            `⏳ 未获取到验证码，${retryInterval / 1000}秒后重试...`,
            "warning"
          );
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
      } catch (error) {
        debugLog("❌ 自动获取验证码出错", "error", error);
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryInterval));
        }
      }
    }

    // 自动获取失败，使用手动输入
    userLog("⚠️ 自动获取失败，请手动输入验证码", "warning");
    debugLog("⚠️ 自动获取验证码失败，请手动输入验证码", "warning");
    const manualCode = await promptForVerificationCode();

    if (manualCode) {
      userLog(`✅ 手动输入验证码: ${manualCode}`, "success");
      debugLog(`✅ 手动输入验证码: ${manualCode}`, "success");
      return manualCode;
    }

    throw new Error("未能获取验证码");
  }

  // 自动填写邮箱并提交
  async function fillEmail() {
    debugLog("📧 开始自动填写邮箱流程", "info");

    try {
      const email = await getGuerrillaEmail();
      userLog(`📧 使用邮箱: ${email}`, "success");
      debugLog(`📧 使用邮箱: ${email}`, "success");

      debugLog("🔍 查找邮箱输入框...", "info");
      // 修复：使用正确的选择器
      const emailInput =
        (await waitForElement('input[name="email"]')) ||
        (await waitForElement('input[id="email"]')) ||
        (await waitForElement('input[type="email"]')) ||
        (await waitForElement('input[name="username"]'));

      if (!emailInput) {
        debugLog("❌ 未找到邮箱输入框", "error");
        userLog("❌ 未找到邮箱输入框，请检查页面", "error");
        return false;
      }

      userLog("📝 正在填写邮箱...", "info");
      debugLog("✅ 找到邮箱输入框，开始填写", "success");
      debugLog(
        `📝 邮箱输入框属性: name="${emailInput.name}", id="${emailInput.id}", type="${emailInput.type}"`,
        "info"
      );

      // 清空并填写邮箱
      emailInput.value = "";
      emailInput.focus();
      emailInput.value = email;

      // 触发多种事件确保兼容性
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      emailInput.dispatchEvent(new Event("change", { bubbles: true }));
      emailInput.dispatchEvent(new Event("blur", { bubbles: true }));

      userLog("✅ 邮箱填写完成", "success");
      debugLog(`✅ 邮箱填写完成: ${email}`, "success");

      // 等待一下让页面响应
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 点击继续按钮
      debugLog("🔍 查找继续按钮...", "info");
      const continueBtn =
        (await waitForElement('button[type="submit"]')) ||
        (await waitForElement('button[name="action"]')) ||
        (await waitForElement('button:contains("Continue")'));

      if (!continueBtn) {
        debugLog("❌ 未找到继续按钮", "error");
        userLog("❌ 未找到继续按钮，请手动点击", "error");
        return false;
      }

      userLog("🎯 提交邮箱，等待验证码...", "info");
      debugLog("✅ 找到继续按钮，准备点击", "success");
      debugLog(
        `📝 继续按钮属性: type="${continueBtn.type}", name="${continueBtn.name}", text="${continueBtn.textContent}"`,
        "info"
      );

      continueBtn.click();
      debugLog("🎯 已点击继续按钮", "success");
      return true;
    } catch (error) {
      debugLog("❌ 填写邮箱流程失败", "error", error);
      userLog(`❌ 填写邮箱失败: ${error.message}`, "error");
      return false;
    }
  }

  // 填写验证码
  async function fillVerificationCode() {
    debugLog("🔢 开始自动填写验证码流程", "info");

    userLog("🔍 正在获取验证码...", "info");
    const code = await getVerificationCode();
    if (!code) {
      userLog("❌ 未能获取验证码", "error");
      debugLog("❌ 未能获取验证码", "error");
      return false;
    }

    debugLog("🔍 查找验证码输入框...", "info");
    // 修复：使用更灵活的选择器查找验证码输入框
    const codeInput =
      (await waitForElement('input[name="code"]')) ||
      (await waitForElement('input[name="otp"]')) ||
      (await waitForElement('input[name="verification_code"]')) ||
      (await waitForElement('input[placeholder*="验证码"]')) ||
      (await waitForElement('input[placeholder*="code"]')) ||
      (await waitForElement('input[maxlength="6"]')) ||
      (await waitForElement('input[type="text"][maxlength="6"]'));

    if (!codeInput) {
      debugLog("❌ 未找到验证码输入框", "error");
      userLog("❌ 未找到验证码输入框，请检查页面", "error");
      return false;
    }

    userLog(`📝 填写验证码: ${code}`, "info");
    debugLog("✅ 找到验证码输入框，开始填写", "success");
    debugLog(
      `📝 验证码输入框属性: name="${codeInput.name}", placeholder="${codeInput.placeholder}", maxlength="${codeInput.maxLength}"`,
      "info"
    );

    // 清空并填写验证码
    codeInput.value = "";
    codeInput.focus();
    codeInput.value = code;

    // 触发多种事件确保兼容性
    codeInput.dispatchEvent(new Event("input", { bubbles: true }));
    codeInput.dispatchEvent(new Event("change", { bubbles: true }));
    codeInput.dispatchEvent(new Event("blur", { bubbles: true }));

    userLog("✅ 验证码填写完成", "success");
    debugLog("✅ 验证码填写完成", "success");

    // 等待一下让页面响应
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 点击继续按钮
    debugLog("🔍 查找继续按钮...", "info");
    const continueBtn =
      (await waitForElement('button[type="submit"]')) ||
      (await waitForElement('button[name="action"]')) ||
      (await waitForElement('button:contains("Continue")')) ||
      (await waitForElement('button:contains("Verify")')) ||
      (await waitForElement('button:contains("确认")'));

    if (!continueBtn) {
      debugLog("❌ 未找到继续按钮", "error");
      userLog("❌ 未找到继续按钮，请手动点击", "error");
      return false;
    }

    userLog("🎯 提交验证码，完成注册...", "info");
    debugLog("✅ 找到继续按钮，准备点击", "success");
    debugLog(
      `📝 继续按钮属性: type="${continueBtn.type}", name="${continueBtn.name}", text="${continueBtn.textContent}"`,
      "info"
    );

    continueBtn.click();
    debugLog("🎯 已点击继续按钮", "success");
    return true;
  }

  // 同意服务条款并完成注册
  async function completeRegistration() {
    // 查找服务条款复选框
    const checkbox =
      (await waitForElement('input[type="checkbox"]')) ||
      (await waitForElement("#terms-of-service-checkbox")) ||
      (await waitForElement('[data-testid="terms-checkbox"]'));

    if (checkbox && !checkbox.checked) {
      debugLog("☑️ 找到服务条款复选框，正在勾选...", "info");
      checkbox.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 查找注册按钮 - 尝试多种选择器
    debugLog("🔍 查找最终注册按钮...", "info");
    const signupBtn =
      (await waitForElement('button[type="submit"]')) ||
      (await waitForElement('button[type="button"]')) ||
      (await waitForElement('button:contains("Sign up")')) ||
      (await waitForElement('button:contains("注册")')) ||
      (await waitForElement('[data-testid="signup-button"]'));

    if (!signupBtn) {
      debugLog("❌ 未找到注册按钮", "error");
      return false;
    }

    userLog("🎯 正在完成注册...", "info");
    debugLog("✅ 找到注册按钮，正在点击...", "success");
    signupBtn.click();
    debugLog("🎯 已点击最终注册按钮", "success");
    return true;
  }

  // 主函数
  async function main() {
    debugLog("🎬 脚本启动，检查页面URL...", "info");
    debugLog(`🌐 当前页面URL: ${window.location.href}`, "info");

    // 只在注册页面运行
    if (
      !window.location.href.includes("login.augmentcode.com") &&
      !window.location.href.includes("auth.augmentcode.com") &&
      !window.location.href.includes("augmentcode.com")
    ) {
      debugLog("⚠️ 不是目标页面，脚本退出", "warning");
      return;
    }

    userLog("🚀 检测到AugmentCode注册页面", "success");
    debugLog("✅ 检测到目标页面，开始自动注册流程...", "success");
    debugLog(`📍 页面标题: ${document.title}`, "info");
    debugLog(`🔗 完整URL: ${window.location.href}`, "info");

    // 等待页面加载完成
    debugLog("⏳ 等待页面加载完成 (1秒)...", "info");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 检查当前页面状态 - 使用更准确的选择器
    debugLog("🔍 开始检测页面元素...", "info");

    // 修复：使用正确的选择器检测邮箱输入框
    const emailInput =
      document.querySelector('input[name="email"]') ||
      document.querySelector('input[id="email"]') ||
      document.querySelector('input[type="email"]') ||
      document.querySelector('input[name="username"]') ||
      document.querySelector('input[placeholder*="email"]') ||
      document.querySelector('input[placeholder*="邮箱"]') ||
      document.querySelector('input[inputmode="email"]');

    // 修复：使用更准确的选择器检测验证码输入框
    const codeInput =
      document.querySelector('input[name="code"]') ||
      document.querySelector('input[name="otp"]') ||
      document.querySelector('input[name="verification_code"]') ||
      document.querySelector('input[placeholder*="验证码"]') ||
      document.querySelector('input[placeholder*="code"]') ||
      document.querySelector('input[maxlength="6"]') ||
      document.querySelector('input[type="text"][maxlength="6"]');

    const termsCheckbox =
      document.querySelector("#terms-of-service-checkbox") ||
      document.querySelector('input[type="checkbox"]') ||
      document.querySelector('[data-testid="terms-checkbox"]');

    // 检测页面URL和标题
    const isSignupPage =
      window.location.href.includes("/signup") ||
      window.location.href.includes("/register");
    const isLoginPage = window.location.href.includes("/login");
    const pageTitle = document.title;

    debugLog("📊 页面元素检测结果", "info", {
      emailInput: !!emailInput,
      codeInput: !!codeInput,
      termsCheckbox: !!termsCheckbox,
      isSignupPage,
      isLoginPage,
      pageTitle,
      currentUrl: window.location.href,
    });

    if (emailInput) {
      userLog("📧 请点击按钮开始自动注册", "info");
      debugLog("📧 检测到邮箱输入页面", "success");
      logger.updateStatus("📧", "检测到邮箱输入页面，准备自动注册", "success");

      // 显示注册按钮
      const registerButton = logger.showRegisterButton();
      if (registerButton) {
        registerButton.addEventListener("click", async () => {
          debugLog("🎯 用户点击了注册按钮", "info");
          logger.updateStatus("🚀", "开始自动注册流程...", "info");

          try {
            registerButton.disabled = true;
            registerButton.textContent = "正在填写邮箱...";
            registerButton.style.background = "#ea8600";
            debugLog("🔄 按钮状态已更新为处理中", "info");

            if (await fillEmail()) {
              userLog("✅ 邮箱填写完成，等待页面跳转...", "success");
              debugLog(
                "✅ 邮箱填写完成，请等待页面跳转到验证码输入...",
                "success"
              );
              registerButton.textContent = "邮箱填写完成";
              registerButton.style.background = "#34a853";
              logger.updateStatus(
                "✅",
                "邮箱填写完成，等待页面跳转",
                "success"
              );
            } else {
              logger.updateStatus("❌", "邮箱填写失败，请检查页面", "error");
            }
          } catch (error) {
            debugLog("❌ 填写邮箱过程出错", "error", error);
            registerButton.disabled = false;
            registerButton.textContent = "重试自动注册";
            registerButton.style.background = "#d93025";
            logger.updateStatus("❌", `注册失败: ${error.message}`, "error");
          }
        });
      }
    } else if (codeInput) {
      userLog("🔢 检测到验证码页面，自动填写中...", "success");
      debugLog("🔢 检测到验证码输入页面，自动执行验证码填写...", "success");
      logger.updateStatus("🔢", "检测到验证码页面，开始自动填写", "success");

      try {
        if (await fillVerificationCode()) {
          userLog("✅ 验证码填写完成，正在完成注册...", "success");
          debugLog("✅ 验证码填写完成，正在完成注册...", "success");
          logger.updateStatus("✅", "验证码填写完成，正在完成注册", "success");

          debugLog("⏳ 等待2秒后完成注册...", "info");
          await new Promise((resolve) => setTimeout(resolve, 2000));

          if (await completeRegistration()) {
            userLog("🎉 注册成功！", "success");
            debugLog("🎉 注册流程完成！", "success");
            logger.updateStatus("🎉", "注册成功！", "success");
          } else {
            logger.updateStatus("❌", "完成注册失败，请手动操作", "error");
          }
        } else {
          logger.updateStatus("❌", "验证码填写失败，请检查邮箱", "error");
        }
      } catch (error) {
        userLog("❌ 验证码填写失败", "error");
        debugLog("❌ 填写验证码过程出错", "error", error);
        logger.updateStatus("❌", `验证码填写失败: ${error.message}`, "error");
      }
    } else if (termsCheckbox) {
      userLog("📋 检测到服务条款页面，自动处理中...", "success");
      debugLog("📋 检测到服务条款页面，自动勾选同意框...", "success");
      try {
        if (!termsCheckbox.checked) {
          debugLog("☑️ 勾选服务条款复选框", "info");
          termsCheckbox.click();
          debugLog("✅ 已自动勾选服务条款同意框", "success");
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          debugLog("✅ 服务条款已经勾选", "info");
        }

        // 查找并点击注册按钮
        if (await completeRegistration()) {
          userLog("🎉 注册成功！", "success");
          debugLog("🎉 注册流程完成！", "success");
        }
      } catch (error) {
        userLog("❌ 注册过程出错", "error");
        debugLog("❌ 勾选服务条款过程出错", "error", error);
      }
    } else {
      userLog("⚠️ 无法识别页面类型，请手动操作", "warning");
      debugLog("⚠️ 无法识别当前页面状态，请检查页面元素", "warning");
      debugLog(`📄 页面标题: ${document.title}`, "warning");
      debugLog(
        "🔍 页面HTML结构",
        "warning",
        document.body.innerHTML.substring(0, 1000)
      );

      // 显示手动操作按钮
      const registerButton = logger.showRegisterButton();
      if (registerButton) {
        registerButton.textContent = "手动触发注册";
        registerButton.addEventListener("click", async () => {
          userLog("🔄 重新检测页面...", "info");
          debugLog("🔄 手动触发注册流程...", "info");
          // 重新检测页面状态
          setTimeout(() => main(), 1000);
        });
      }
    }
  }

  // 启动脚本
  userLog("🚀 AugmentCode自动注册脚本已启动", "success");
  debugLog("🚀 AugmentCode自动注册脚本启动", "success");
  debugLog("📋 脚本配置信息", "info", {
    version: "0.1",
    apiUrl: GUERRILLA_MAIL_CONFIG.apiUrl,
    userAgent: navigator.userAgent.substring(0, 100),
  });

  main().catch((error) => {
    userLog("❌ 脚本启动出错", "error");
    debugLog("❌ 脚本启动出错", "error", error);
  });
})();
