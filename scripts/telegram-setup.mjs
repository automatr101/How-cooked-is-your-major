// Finds your Telegram chat ID, saves it to .env.local, and sends a confirmation message.
// Usage: message your bot once in Telegram, then run `npm run telegram:setup`.
// The bot token is read from .env.local and is never printed.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const ENV_PATH = ".env.local";
const API = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";

if (!existsSync(ENV_PATH)) {
  console.error("No .env.local found. Copy .env.example to .env.local first.");
  process.exit(1);
}

const env = readFileSync(ENV_PATH, "utf8");
const token = env.match(/^TELEGRAM_BOT_TOKEN=(.+)$/m)?.[1]?.trim();
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is empty in .env.local. Paste the token from @BotFather there first.");
  process.exit(1);
}

async function call(method, body) {
  // Errors are reported by status only: the URL contains the token.
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Telegram answered ${res.status}${res.status === 401 ? " (the token looks wrong)" : ""}`);
  return res.json();
}

try {
  const { result } = await call("getUpdates");
  const chats = new Map();
  for (const u of result) {
    const chat = (u.message ?? u.channel_post ?? u.my_chat_member)?.chat;
    if (chat) chats.set(chat.id, chat);
  }
  if (chats.size === 0) {
    console.error("No messages found. Open your bot in Telegram, press Start (or send any message), then run this again.");
    process.exit(1);
  }
  const [id, chat] = [...chats.entries()].pop(); // most recent chat
  const label = chat.title ?? chat.username ?? chat.first_name ?? "this chat";

  const updated = /^TELEGRAM_CHAT_ID=.*$/m.test(env)
    ? env.replace(/^TELEGRAM_CHAT_ID=.*$/m, `TELEGRAM_CHAT_ID=${id}`)
    : `${env.trimEnd()}\nTELEGRAM_CHAT_ID=${id}\n`;
  writeFileSync(ENV_PATH, updated);
  console.log(`Saved TELEGRAM_CHAT_ID for "${label}" to ${ENV_PATH}.`);

  await call("sendMessage", { chat_id: id, text: "✅ Alerts connected. You'll get a message here when someone scans a major." });
  console.log("Sent a confirmation message. Check Telegram.");
  console.log("\nRemember to add TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID and TELEGRAM_NOTIFY_MODE in Vercel too, then redeploy.");
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
