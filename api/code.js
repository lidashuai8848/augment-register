import { ImapFlow } from "imapflow";

export default async (req, res) => {
  // 设置 CORS 头部，允许插件调用
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "只支持POST请求",
    });
  }

  // 从环境变量读取，Vercel 面板 → Settings → Environment Variables
  const { user, pass } = {
    user: process.env.QQ_USER,
    pass: process.env.QQ_PASS,
  };

  // 检查环境变量
  if (!user || !pass) {
    console.log("❌ 环境变量未配置");
    return res.status(500).json({
      success: false,
      message: "服务器配置错误：缺少邮箱认证信息",
    });
  }

  console.log(`📧 开始处理验证码请求，QQ邮箱: ${user}`);

  let client;
  try {
    client = new ImapFlow({
      host: "imap.qq.com",
      port: 993,
      secure: true,
      auth: { user, pass },
      logger: false,
    });

    console.log("🔌 正在连接IMAP服务器...");
    await client.connect();
    console.log("✅ IMAP连接成功");

    const lock = await client.getMailboxLock("INBOX");

    let code = null;
    let tries = 0;

    // 先等待5秒让邮件到达
    console.log("⏳ 等待5秒让邮件到达...");
    await new Promise((r) => setTimeout(r, 5000));

    while (tries < 5) {
      try {
        // 获取邮箱状态
        const status = await client.status("INBOX", { messages: true });
        console.log(`📬 邮箱总邮件数: ${status.messages}`);

        // 获取最新的3封邮件进行检查
        const messages = [];
        if (status.messages > 0) {
          const messagesToCheck = Math.min(3, status.messages);
          const startSeq = Math.max(1, status.messages - messagesToCheck + 1);
          console.log(
            `🔍 检查最新 ${messagesToCheck} 封邮件 (序号 ${startSeq}-${status.messages})`
          );

          for await (const msg of client.fetch(
            `${startSeq}:${status.messages}`,
            {
              source: true,
              envelope: true,
            }
          )) {
            messages.push(msg);
          }
        }

        // 遍历邮件寻找验证码
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          const text = msg.source.toString("utf8");

          console.log(
            `📧 检查邮件 ${i + 1}: 发件人=${
              msg.envelope.from?.[0]?.address || "未知"
            }`
          );

          // 检查是否包含AugmentCode相关内容（不区分大小写）
          const textLower = text.toLowerCase();
          if (
            textLower.includes("augmentcode") ||
            textLower.includes("augment") ||
            textLower.includes("verification") ||
            textLower.includes("验证码") ||
            textLower.includes("code")
          ) {
            console.log(`🎯 找到相关邮件，开始提取验证码...`);

            // 尝试多种验证码匹配模式
            const patterns = [
              /\b\d{6}\b/g, // 标准6位数字
              />\s*(\d{6})\s*</g, // HTML标签中的6位数字
              /验证码[：:\s]*(\d{6})/g, // 中文验证码标识
              /code[：:\s]*(\d{6})/gi, // 英文code标识
            ];

            for (const pattern of patterns) {
              const matches = text.match(pattern);
              if (matches) {
                for (const match of matches) {
                  const extractedCode = match.replace(/[^\d]/g, "");
                  if (
                    extractedCode.length === 6 &&
                    extractedCode !== "000000"
                  ) {
                    console.log(`✅ 成功提取验证码: ${extractedCode}`);
                    code = extractedCode;
                    break;
                  }
                }
                if (code) break;
              }
            }

            if (code) break;
          }
        }

        if (code) break;
      } catch (error) {
        console.log(`❌ 尝试 ${tries + 1} 失败:`, error.message);
      }

      tries++;
      if (tries < 5) {
        console.log(`⏳ 等待3秒后重试...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    lock.release();
    await client.logout();
    console.log("🔌 IMAP连接已关闭");

    // 返回结果，包含成功状态
    if (code) {
      console.log(`🎉 验证码获取成功: ${code}`);
      res.json({ success: true, code, message: "验证码获取成功" });
    } else {
      console.log("❌ 未找到验证码");
      res.json({ success: false, code: null, message: "未找到验证码" });
    }
  } catch (error) {
    console.log(`💥 API处理异常: ${error.message}`);

    // 确保连接被正确关闭
    if (client) {
      try {
        await client.logout();
      } catch (e) {
        console.log("⚠️ 关闭IMAP连接时出错:", e.message);
      }
    }

    // 返回错误信息
    res.status(500).json({
      success: false,
      code: null,
      message: `服务器错误: ${error.message}`,
    });
  }
};
