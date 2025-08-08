import { ImapFlow } from "imapflow";

export default async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  // 设置 CORS 头部，允许插件调用
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 从环境变量读取，Vercel 面板 → Settings → Environment Variables
  const { user, pass } = {
    user: process.env.QQ_USER,
    pass: process.env.QQ_PASS,
  };

  const client = new ImapFlow({
    host: "imap.qq.com",
    port: 993,
    secure: true,
    auth: { user, pass },
  });
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");

  let code = null;
  let tries = 0;

  // 先等待5秒让邮件到达
  await new Promise((r) => setTimeout(r, 5000));

  while (tries < 5) {
    try {
      // 获取邮箱状态
      const status = await client.status("INBOX", { messages: true });
      console.log(`邮箱总邮件数: ${status.messages}`);

      // 获取收件箱倒序第一个（最新收到的邮件）
      const messages = [];
      if (status.messages > 0) {
        // 直接获取最新的邮件（序号最大的）
        const latestSeq = status.messages;
        console.log(`获取最新邮件序号: ${latestSeq}`);

        for await (const msg of client.fetch(latestSeq, {
          source: true,
          envelope: true,
        })) {
          messages.push(msg);
        }
      }

      // 遍历邮件寻找验证码
      for (const msg of messages) {
        const text = msg.source.toString("utf8");

        // 检查是否包含AugmentCode相关内容
        if (
          text.includes("augmentcode") ||
          text.includes("verification") ||
          text.includes("验证码")
        ) {
          const match = text.match(/\b\d{6}\b/);
          if (match && match[0] !== "000000") {
            code = match[0];
            break;
          }
        }
      }

      if (code) break;
    } catch (error) {
      console.log(`尝试 ${tries + 1} 失败:`, error.message);
    }

    tries++;
    if (tries < 5) await new Promise((r) => setTimeout(r, 3000)); // 等待3秒
  }

  lock.release();
  await client.logout();

  // 返回结果，包含成功状态
  if (code) {
    res.json({ success: true, code, message: "验证码获取成功" });
  } else {
    res.json({ success: false, code: null, message: "未找到验证码" });
  }
};
