import { ImapFlow } from "imapflow";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // 从环境变量读取，Vercel 面板 → Settings → Environment Variables
  const user = process.env.QQ_USER;
  const pass = process.env.QQ_PASS;

  const client = new ImapFlow({
    host: "imap.qq.com",
    port: 993,
    secure: true,
    auth: { user, pass },
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const msg = await client.fetchOne("*", { source: true });
    const body = msg.source.toString("utf8");
    const code = body.match(/\b\d{6}\b/)?.[0] ?? null;
    res.json({ code });
  } finally {
    lock.release();
    await client.logout();
  }
}
