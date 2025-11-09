import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error(
    'BOT_TOKEN is missing. Add it to the project root ".env" file (BOT_TOKEN=xxxx).',
  );
}

/**
 * Replace this URL with the hosted version of your React web app.
 * Make sure the link is HTTPS so Telegram can load it inside the WebApp view.
 */
const WEB_APP_URL = 'https://my-imposter-game.onrender.com';

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/i, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    '👋 እንኳን ወደ የኢምፖስተር ጨዋታ ቦት በደህና መጡ!\n\n' +
      'የተዘጋጀውን የድህረገፅ ጨዋታ በቴሌግራም ውስጥ በቅርብ ይክፈቱ።',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 ጨዋታውን ጀምር',
              web_app: { url: WEB_APP_URL },
            },
          ],
        ],
      },
    },
  );
});

/**
 * OPTIONAL (future): receive data back from the WebApp.
 *
 * Inside your React app you can call:
 *   window.Telegram.WebApp.sendData(JSON.stringify({ action: 'game-started' }));
 *
 * Telegram delivers that payload to the bot as a “web_app_data” message.
 */
bot.on('message', async (msg) => {
  if (!msg.web_app_data) return;

  const chatId = msg.chat.id;
  const payload = msg.web_app_data.data;

  try {
    const data = JSON.parse(payload);
    await bot.sendMessage(
      chatId,
      `✅ ለቦቱ የተላከው መረጃ ተቀባችሁ፦\n<code>${JSON.stringify(
        data,
        null,
        2,
      )}</code>`,
      { parse_mode: 'HTML' },
    );
  } catch {
    await bot.sendMessage(chatId, `✅ ተቀባችሁ: ${payload}`);
  }
});

console.log('🤖 Telegram bot is running. Press Ctrl+C to stop.');


