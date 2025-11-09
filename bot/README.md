# Telegram WebApp Bridge

This directory contains a minimal Telegram bot that launches the Amharic Imposter web app inside Telegram using the WebApp integration.

---

## 1. Prerequisites

- Node.js **18+**
- A bot token from [@BotFather](https://t.me/BotFather)

Project layout (root):

```
/my-imposter-game
 ┣ /client        # React frontend
 ┣ /server        # Node backend
 ┣ /bot           # Telegram bot (this folder)
 ┣ .env           # BOT_TOKEN=xxxx copied from BotFather
 ┗ package.json
```

> The bot reads `BOT_TOKEN` from the root `.env`. Keep that file out of source control.

---

## 2. Installation

```bash
cd bot
npm install
```

To run locally with auto-restart:

```bash
npm run dev
```

Or run once:

```bash
npm start
```

Use `/start` in Telegram to see the “🎮 ጨዋታውን ጀምር” button. The button opens the hosted React app **inside** Telegram.

---

## 3. Configure the WebApp URL

Open `bot/bot.js` and replace the placeholder:

```js
const WEB_APP_URL = 'https://my-imposter-game.onrender.com';
```

Use your deployed HTTPS link (Render, Vercel, Netlify, etc.). Telegram requires HTTPS.

---

## 4. Deploying the Bot (Render / Railway)

1. Push your repo to GitHub.
2. Create a new **web service** on Render or Railway.
3. Set the start command to `npm start` (the bot uses long polling).
4. Add an environment variable `BOT_TOKEN` with the value from BotFather.
5. Deploy. The bot stays online as long as the service is running.

> No webhook config is needed because the bot uses polling; the platform just has to keep the Node.js process alive.

---

## 5. (Optional) Send Data Back to the Bot

From the React app (running in Telegram), call:

```js
window.Telegram.WebApp.sendData(
  JSON.stringify({ action: 'game-started', timestamp: Date.now() }),
);
```

The bot listens for `web_app_data` messages and will echo the payload to the chat. Modify `bot.js` to handle the payload however you need (store scores, start rounds, etc.).

---

That’s it! Once deployed, share the bot link with players—Telegram will host the UI inline while your Node/React backend handles the gameplay logic. 🎉

