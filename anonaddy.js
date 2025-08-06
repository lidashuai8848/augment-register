// ==UserScript==
// @name         AugmentCode自动注册（AnonAddy 版）
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  使用 AnonAddy 无限邮箱自动完成 AugmentCode 注册
// @author       Zk
// @match        https://*.augmentcode.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=augmentcode.com
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// @connect      app.addy.io
// ==/UserScript==

(function () {
  "use strict";

  /* ---------- 1. 日志面板 ---------- */
  function createLogUI() {
    const logContainer = document.createElement("div");
    logContainer.innerHTML = `
		<div id="auto-register-log" style="
		  position: fixed; bottom: 40px; right: 20px; width: 300px; max-height: 400px;
		  background: rgba(255,255,255,.95); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.15);
		  z-index: 10000; font-family: Arial, sans-serif; overflow: hidden; display: flex; flex-direction: column;">
		  <div style="padding: 12px; background: #1a73e8; color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
			<span>自动注册日志</span>
			<div>
			  <button id="auto-register-btn" style="background: #34a853; border: none; color: white; cursor: pointer; font-size: 12px; padding: 4px 8px; border-radius: 4px; margin-right: 8px; display: none;">开始注册</button>
			  <button id="clear-log" style="background: transparent; border: none; color: white; cursor: pointer; font-size: 12px;">清除</button>
			  <button id="minimize-log" style="background: transparent; border: none; color: white; cursor: pointer; font-size: 14px; margin-left: 8px;">_</button>
			</div>
		  </div>
		  <div style="padding: 8px 12px; background: #f8f9fa; border-bottom: 1px solid #e8eaed; font-size: 12px; color: #5f6368;">
			<span style="color: #1a73e8;">📢</span> 关注公众号「code 未来」获取更多技术资源
		  </div>
		  <div id="log-content" style="padding: 12px; overflow-y: auto; max-height: 300px; font-size: 13px;"></div>
		</div>`;
    document.body.appendChild(logContainer);

    let isMinimized = false;
    const logContent = document.getElementById("log-content");
    document.getElementById("minimize-log").onclick = () => {
      isMinimized = !isMinimized;
      logContent.style.display = isMinimized ? "none" : "block";
      document.getElementById("minimize-log").textContent = isMinimized
        ? "□"
        : "_";
    };
    document.getElementById("clear-log").onclick = () =>
      (logContent.innerHTML = "");

    return {
      log: (msg, type = "info") => {
        const div = document.createElement("div");
        div.style.cssText = `margin-bottom: 8px; padding: 8px; border-radius: 4px; word-break: break-word;`;
        const colors = {
          success: "background:#e6f4ea;color:#1e8e3e",
          error: "background:#fce8e6;color:#d93025",
          warning: "background:#fef7e0;color:#ea8600",
        };
        div.style.cssText += colors[type] || "background:#f8f9fa;color:#202124";
        div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logContent.appendChild(div);
        logContent.scrollTop = logContent.scrollHeight;
      },
      showRegisterButton: () => {
        const btn = document.getElementById("auto-register-btn");
        if (btn) btn.style.display = "inline-block";
        return btn;
      },
    };
  }

  const logger = createLogUI();
  const userLog = (msg, type) => logger.log(msg, type);
  const debugLog = (msg, type = "info", obj) => {
    console.log(`%c${msg}`, `color:#1a73e8`);
    obj && console.log(obj);
  };

  /* ---------- 2. AnonAddy 配置 ---------- */
  const ADDY = {
    apiRoot: "https://app.addy.io/api/v1",
    token: "addy_io_mu25tT4h7MST1iT468wUgcEQcWE1C56hrg17mDHx530d63b1",
    currentAlias: null,
  };

  /* ---------- 3. AnonAddy API 封装 ---------- */
  function addyRequest(endpoint, method = "GET", body = null) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url: `${ADDY.apiRoot}${endpoint}`,
        headers: {
          Authorization: `Bearer ${ADDY.token}`,
          "Content-Type": "application/json",
        },
        data: body ? JSON.stringify(body) : undefined,
        onload: (r) => {
          try {
            resolve(JSON.parse(r.responseText));
          } catch (e) {
            reject(e);
          }
        },
        onerror: reject,
      });
    });
  }

  async function createAlias() {
    const data = await addyRequest("/aliases", "POST", {
      domain: "user202vcd.anonaddy.com",
    });
    ADDY.currentAlias = data.data.email;
    return ADDY.currentAlias;
  }

  async function checkEmails(aliasId) {
    const data = await addyRequest(`/aliases/${aliasId}/emails`);
    return data.data.filter((e) =>
      e.subject.toLowerCase().includes("verification")
    )[0];
  }

  async function getEmailText(emailId) {
    const data = await addyRequest(`/emails/${emailId}`);
    return data.data.text || data.data.html;
  }

  /* ---------- 4. 页面工具 ---------- */
  async function waitFor(sel, timeout = 10000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const el = document.querySelector(sel);
      if (el) return el;
      await new Promise((r) => setTimeout(r, 200));
    }
    return null;
  }

  function extractCode(text) {
    const m = text.match(/\b\d{6}\b/);
    return m ? m[0] : null;
  }

  /* ---------- 5. 主流程 ---------- */
  async function fillEmail() {
    const email = await createAlias();
    userLog(`📧 创建别名: ${email}`, "success");
    const inp = await waitFor('input[name="username"],input[type="email"]');
    if (!inp) return false;
    inp.value = email;
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    const btn = await waitFor('button[type="submit"]');
    if (!btn) return false;
    btn.click();
    return true;
  }

  async function fillCode() {
    const aliasId = ADDY.currentAlias.split("@")[0];
    let emailObj;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      emailObj = await checkEmails(aliasId);
      if (emailObj) break;
      userLog("⏳ 等待验证码邮件...", "info");
    }
    if (!emailObj) {
      userLog("❌ 未收到验证码邮件", "error");
      return false;
    }
    const body = await getEmailText(emailObj.id);
    const code = extractCode(body);
    if (!code) {
      userLog("❌ 无法解析验证码", "error");
      return false;
    }
    userLog(`🔢 解析到验证码: ${code}`, "success");
    const inp = await waitFor('input[name="code"],input[maxlength="6"]');
    if (!inp) return false;
    inp.value = code;
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    const btn = await waitFor('button[type="submit"]');
    if (!btn) return false;
    btn.click();
    return true;
  }

  async function complete() {
    const chk = await waitFor('input[type="checkbox"]');
    if (chk && !chk.checked) chk.click();
    const btn = await waitFor('button[type="submit"],button[type="button"]');
    if (!btn) return false;
    btn.click();
    return true;
  }

  async function run() {
    userLog("🚀 脚本启动");
    await new Promise((r) => setTimeout(r, 1500));

    const emailInp = document.querySelector(
      'input[name="username"],input[type="email"]'
    );
    const codeInp = document.querySelector(
      'input[name="code"],input[maxlength="6"]'
    );
    const chk = document.querySelector('input[type="checkbox"]');

    if (emailInp) {
      userLog("📧 检测到邮箱页面");
      const btn = logger.showRegisterButton();
      if (btn)
        btn.onclick = async () => {
          btn.disabled = true;
          btn.textContent = "处理中...";
          if (await fillEmail()) userLog("✅ 已提交邮箱，等待验证码...");
          else btn.disabled = false;
        };
    } else if (codeInp) {
      userLog("🔢 检测到验证码页面");
      await fillCode();
    } else if (chk) {
      userLog("📋 检测到条款页面");
      await complete();
    } else {
      userLog("⚠️ 未知页面，请手动操作");
    }
  }

  run().catch((e) => userLog("❌ 脚本异常: " + e.message, "error"));
})();
