// ==UserScript==
// @name        Augment 全自动注册
// @namespace   augment-8step
// @version     4.0
// @match       https://augmentcode.com/*
// @match       https://www.augmentcode.com/*
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// ==/UserScript==

(() => {
  "use strict";

  /* ======== 配置 ======== */
  const API_URL = "https://augment-register.vercel.app/api/code"; // 修改为你的 Vercel 部署地址
  const DOMAIN = "zk133.anonaddy.com"; // 修改为你的 AnonAddy 域名
  /* ====================== */

  /* ---- 通用工具 ---- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const randStr = () => Math.random().toString(36).slice(2, 10);

  /* ---- 精准 DOM 选择器 ---- */
  const $ = {
    email: () => document.querySelector("input[type=email]"),
    code: () => document.querySelector("input[name=code], input[type=number]"),
    agree: () =>
      document.querySelector('input[type=checkbox][name*="agree" i]'),
    btn: (text) =>
      [...document.querySelectorAll("button")].find((b) =>
        b.textContent.trim().toLowerCase().includes(text.toLowerCase())
      ),
  };

  /* ---- 等待元素出现 ---- */
  const wait = (selFn, timeout = 10000) =>
    new Promise((resolve, reject) => {
      const t0 = Date.now();
      const timer = setInterval(() => {
        const el = selFn();
        if (el) {
          clearInterval(timer);
          resolve(el);
        }
        if (Date.now() - t0 > timeout) {
          clearInterval(timer);
          reject("timeout");
        }
      }, 200);
    });

  /* ---- 主流程 ---- */
  async function run() {
    /* 1️⃣ 生成邮箱 */
    const emailInput = await wait($.email);
    const email = randStr() + "@" + DOMAIN;
    emailInput.value = email;
    emailInput.dispatchEvent(new Event("input", { bubbles: true }));

    /* 2️⃣ 点击 Continue（发送验证码） */
    const sendBtn = await wait(() => $.btn("continue"));
    sendBtn.click();

    /* 3️⃣ 等 5 秒 */
    await sleep(5000);

    /* 4️⃣ 拉验证码 */
    const codeInput = await wait($.code);
    GM_xmlhttpRequest({
      method: "POST",
      url: API_URL,
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ user: QQ_USER, pass: QQ_PASS }),
      onload: async (resp) => {
        const { code } = await resp.json();
        if (code) {
          codeInput.value = code;
          codeInput.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          alert("验证码获取失败，请手动查看邮箱");
        }
      },
    });
  }

  /* ---- 浮动按钮 ---- */
  GM_addStyle(`
    #augment-panel{
      position:fixed;right:20px;bottom:20px;z-index:9999;
      background:#007bff;color:#fff;border:none;border-radius:6px;
      padding:8px 14px;font-size:14px;font-family:Arial;cursor:pointer;
    }
  `);
  const btn = document.createElement("button");
  btn.id = "augment-panel";
  btn.textContent = "一键注册";
  btn.onclick = run;
  document.body.appendChild(btn);
})();
