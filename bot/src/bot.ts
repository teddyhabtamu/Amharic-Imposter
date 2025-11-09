import { config } from 'dotenv';
import { Markup, Telegraf, type Context, type NarrowedContext } from 'telegraf';
import type { CallbackQuery, Update } from 'telegraf/typings/core/types/typegram';

import { pickRandomWord } from './words.js';

config();

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error('BOT_TOKEN is missing. Please set it in your environment variables.');
}

type Stage =
  | 'idle'
  | 'askPlayerCount'
  | 'collectNames'
  | 'askImposterCount'
  | 'reveal'
  | 'voting'
  | 'result';

type PlayerAssignment = {
  id: number;
  name: string;
  isImposter: boolean;
  word: string | null;
};

type Session = {
  stage: Stage;
  playerCount: number;
  playerNames: string[];
  imposterCount: number;
  assignments: PlayerAssignment[];
  selectedWord: string;
  currentRevealIndex: number;
  wordRevealed: boolean;
  currentVoterIndex: number;
  votes: number[];
};

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;
const MIN_IMPOSTERS = 1;

const sessions = new Map<number, Session>();

const createDefaultName = (index: number) => `ተጫዋች ${index + 1}`;

const ensureNameList = (count: number, current: string[]) => {
  const trimmed = current.slice(0, count);
  if (trimmed.length === count) return trimmed;

  const next = [...trimmed];
  for (let i = trimmed.length; i < count; i += 1) {
    next.push(createDefaultName(i));
  }

  return next;
};

const getMaxImposters = (count: number) =>
  Math.max(MIN_IMPOSTERS, Math.max(0, count - 1));

const resetSession = (): Session => ({
  stage: 'askPlayerCount',
  playerCount: MIN_PLAYERS,
  playerNames: ensureNameList(MIN_PLAYERS, []),
  imposterCount: MIN_IMPOSTERS,
  assignments: [],
  selectedWord: '',
  currentRevealIndex: 0,
  wordRevealed: false,
  currentVoterIndex: 0,
  votes: [],
});

const getSession = (chatId: number) => {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, resetSession());
  }
  return sessions.get(chatId)!;
};

const bot = new Telegraf(token);

const formatPlayerList = (session: Session) =>
  session.assignments
    .map((player) => `• ${player.name}${player.isImposter ? ' (ኢምፖስተር)' : ''}`)
    .join('\n');

const buildRevealMessage = (session: Session) => {
  const player = session.assignments[session.currentRevealIndex];
  const intro = `👤 ተጫዋች: <b>${player.name}</b>\nዙር ${
    session.currentRevealIndex + 1
  } / ${session.assignments.length}`;

  if (!session.wordRevealed) {
    return {
      text: `${intro}\n\nቃሉን ለማየት እባክዎን ቁልፉን ይንኩ። ሌሎች ተጫዋቾች እንዳይመልከቱ ያረጋግጡ።`,
      keyboard: Markup.inlineKeyboard([
        Markup.button.callback('👁‍🗨 ቃሉን አሳይ', 'reveal:show'),
      ]),
    };
  }

  const word = player.word ?? '???';
  const baseText = `${intro}\n\n<b>የእርስዎ ቃል:</b> ${word}`;
  const imposterNotice = player.isImposter
    ? `\n\n🚨 <b>እርስዎ ኢምፖስተሩ ናቸው!</b> ዝም ብለው ይጠብቁ።`
    : '';

  return {
    text: `${baseText}${imposterNotice}\n\nበቀጣዩ ተጫዋች ይቀጥሉ።`,
    keyboard: Markup.inlineKeyboard([
      Markup.button.callback('➡️ ቀጣይ ተጫዋች', 'reveal:next'),
    ]),
  };
};

const buildVoteKeyboard = (session: Session) => {
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  const selected = session.votes[session.currentVoterIndex];

  session.assignments.forEach((player, index) => {
    const isSelected = selected === index;
    const label = `${isSelected ? '✅ ' : ''}${player.name}`;
    const button = Markup.button.callback(label, `vote:select:${index}`);

    if (rows.length === 0 || rows[rows.length - 1].length === 2) {
      rows.push([button]);
    } else {
      rows[rows.length - 1].push(button);
    }
  });

  rows.push([Markup.button.callback('✅ ድምጽ ያረጋግጡ', 'vote:confirm')]);
  return Markup.inlineKeyboard(rows);
};

const buildVoteMessage = (session: Session) => {
  const voter = session.assignments[session.currentVoterIndex];
  const selectedIndex = session.votes[session.currentVoterIndex];
  const selectedName =
    selectedIndex >= 0 ? session.assignments[selectedIndex].name : '—';

  const text = [
    `🗳️ <b>${voter.name}</b>፣ ኢምፖስተሮቹን ይጥቁ!`,
    `ዙር ${session.currentVoterIndex + 1} / ${session.assignments.length}`,
    '',
    `በቅድሚያ እየተመረጡ ያሉት: <b>${selectedName}</b>`,
    'የተናገሩትን አስታውሱ እና እውቀቱን ይጠቀሙ።',
  ].join('\n');

  return {
    text,
    keyboard: buildVoteKeyboard(session),
  };
};

const computeResultSummary = (session: Session) => {
  const highestVote = session.votes.reduce((acc, vote) => {
    if (vote === -1) return acc;
    const voteCount = session.votes.filter((item) => item === vote).length;
    return Math.max(acc, voteCount);
  }, 0);

  const voteSummary = session.assignments.map((player, index) => ({
    player,
    votes: session.votes.filter((vote) => vote === index).length,
  }));

  const mostVotedNames = voteSummary
    .filter((entry) => entry.votes === highestVote && highestVote > 0)
    .map((entry) => entry.player.name)
    .join(', ');

  return {
    highestVote,
    voteSummary,
    mostVotedNames,
  };
};

const createResultMessage = (session: Session) => {
  const { highestVote, voteSummary, mostVotedNames } = computeResultSummary(
    session,
  );
  const imposters = session.assignments.filter((player) => player.isImposter);
  const imposterNames = imposters.map((player) => player.name).join(', ');
  const isPlural = imposters.length > 1;

  const lines = [
    `🎉 ጨዋታ ተጠናቋል!`,
    '',
    `<b>${imposterNames}</b> ${isPlural ? 'ኢምፖስተሮቹ ነበሩ!' : 'ኢምፖስተሩ ነበሩ!'}`,
    `እውነተኛው ቃል: <b>${session.selectedWord}</b>`,
    '',
    '🗳️ የድምጽ ማጠቃለያ:',
    ...voteSummary.map(
      ({ player, votes }) =>
        `• ${player.name}${
          player.isImposter ? ' (ኢምፖስተር)' : ''
        }: <b>${votes}</b> ድምጽ`,
    ),
  ];

  if (highestVote > 0) {
    lines.push('', `ብዙዎቹ የመጣሉት: <b>${mostVotedNames}</b>`);
  } else {
    lines.push('', 'ማንም ተጫዋች የተመረጠ አልተገኘም።');
  }

  return lines.join('\n');
};

bot.start(async (ctx) => {
  const chatId = ctx.chat?.id;
  if (typeof chatId === 'undefined') return;

  sessions.set(chatId, resetSession());

  await ctx.reply(
    [
      '👋 እንኳን ወደ የአማርኛ ኢምፖስተር ጨዋታ ቦት በደህና መጡ!',
      '',
      'ተጫዋቾችን ለማዘጋጀት እና ዘመናዊ ካርድ ቅርጽ በመከተል ጨዋታውን ለመጀመር በእርስዎ መረጃ ይመራሉ።',
      '',
      `👉 እባክዎን /newgame በማስጀመር ይጀምሩ።`,
      '',
      `ℹ️ ጨዋታው በአንድ መሳሪያ ላይ ተለዋዋጭ በመሆኑ ለእያንዳንዱ ተጫዋች ቀጥሎ ይሰጣል።`,
    ].join('\n'),
    { parse_mode: 'HTML' },
  );
});

bot.command('newgame', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (typeof chatId === 'undefined') return;

  const session = resetSession();
  sessions.set(chatId, session);

  await ctx.reply(
    [
      '🆕 አዲስ ጨዋታ ጀምሯል!',
      `እባክዎን የተጫዋቾች ቁጥርን ያስገቡ (ዝርዝር: ${MIN_PLAYERS} - ${MAX_PLAYERS}).`,
    ].join('\n'),
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    [
      '🛟 የጨዋታ መመሪያ:',
      '',
      '• /newgame – አዲስ ጨዋታ ይጀምሩ',
      '• ቁጥር ያስገቡ – ተጫዋቾች ብዛት',
      '• ስሞች ያስገቡ – በኮማ ወይም በመስመር ይለዩ',
      '• ኢምፖስተሮች ቁጥር ይመርጡ',
      '• ተቀራሪ ተጫዋቾች ቃሉን ይመልከቱ',
      '• ድምጾችን ያረጋግጡ እና ውጤቱን ይመልከቱ',
    ].join('\n'),
  );
});

bot.on('text', async (ctx) => {
  const chatId = ctx.chat?.id;
  if (typeof chatId === 'undefined') return;

  const session = getSession(chatId);
  const message = ctx.message.text.trim();

  if (message.startsWith('/')) {
    return; // commands handled separately
  }

  if (session.stage === 'askPlayerCount') {
    const count = Number(message);
    if (!Number.isInteger(count) || count < MIN_PLAYERS || count > MAX_PLAYERS) {
      await ctx.reply(
        `⛔ እባክዎን ${MIN_PLAYERS} እና ${MAX_PLAYERS} መካከል ያለ ቁጥር ያስገቡ።`,
      );
      return;
    }

    session.playerCount = count;
    session.playerNames = ensureNameList(count, session.playerNames);
    session.stage = 'collectNames';

    await ctx.reply(
      [
        '📝 የተጫዋቾች ስሞችን ይላኩ።',
        'በኮማ ወይም በመስመር መለየት ይቻላል (ምሳሌ: ሀ፣ ለ፣ ሐ).',
        'ስም ካልተጠናቀቀ በራስ-ሰር ይሞላል።',
      ].join('\n'),
    );
    return;
  }

  if (session.stage === 'collectNames') {
    const rawNames = message
      .split(/[\n,]/)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    session.playerNames = ensureNameList(
      session.playerCount,
      rawNames.length > 0 ? rawNames : session.playerNames,
    );
    session.stage = 'askImposterCount';

    await ctx.reply(
      [
        `🎭 ከተጫዋቾች መካከል ስንት ኢምፖስተሮች ይኖሩ?`,
        `እባክዎን ቁጥር ያስገቡ (ዝርዝር: ${MIN_IMPOSTERS} - ${getMaxImposters(
          session.playerCount,
        )}).`,
      ].join('\n'),
    );
    return;
  }

  if (session.stage === 'askImposterCount') {
    const imposters = Number(message);
    const maxImposters = getMaxImposters(session.playerCount);

    if (
      !Number.isInteger(imposters) ||
      imposters < MIN_IMPOSTERS ||
      imposters > maxImposters
    ) {
      await ctx.reply(
        `⛔ ኢምፖስተሮች ቁጥር ${MIN_IMPOSTERS} እና ${maxImposters} መካከል መሆን አለበት።`,
      );
      return;
    }

    session.imposterCount = imposters;

    const imposterIndices = new Set<number>();
    while (imposterIndices.size < imposters) {
      imposterIndices.add(Math.floor(Math.random() * session.playerCount));
    }

    const word = pickRandomWord();
    session.assignments = session.playerNames.map((name, index) => ({
      id: index,
      name,
      isImposter: imposterIndices.has(index),
      word: imposterIndices.has(index) ? null : word,
    }));
    session.selectedWord = word;
    session.votes = Array(session.playerCount).fill(-1);
    session.currentRevealIndex = 0;
    session.wordRevealed = false;
    session.currentVoterIndex = 0;
    session.stage = 'reveal';

    const { text, keyboard } = buildRevealMessage(session);
    await ctx.reply(
      [
        '🃏 ስዕል ዝግጁ ነው!',
        `ተጫዋቾች ቁጥር: ${session.playerCount}`,
        `ኢምፖስተሮች: ${session.imposterCount}`,
        '',
        'ለእያንዳንዱ ተጫዋች ቃሉን ተከትለው ይያዙ።',
      ].join('\n'),
      { parse_mode: 'HTML' },
    );

    await ctx.reply(text, {
      parse_mode: 'HTML',
      ...keyboard,
    });
    return;
  }

  await ctx.reply('ℹ️ እባክዎን /newgame በመጠቀም አዲስ ጨዋታ ይጀምሩ።');
});

type CallbackContext = NarrowedContext<
  Context<Update>,
  Update.CallbackQueryUpdate<CallbackQuery>
>;

const handleRevealCallbacks = async (ctx: CallbackContext) => {
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) {
    await ctx.answerCbQuery();
    return;
  }

  const dataQuery = callbackQuery as CallbackQuery.DataQuery;
  const chatId = dataQuery.message?.chat.id;
  if (typeof chatId === 'undefined') {
    await ctx.answerCbQuery();
    return;
  }

  const session = getSession(chatId);

  if (session.stage !== 'reveal') {
    await ctx.answerCbQuery('ቅድሚያው ተለዋዋጭ አልሆነም።');
    return;
  }

  if (dataQuery.data === 'reveal:show') {
    if (session.wordRevealed) {
      await ctx.answerCbQuery('ቃሉ ቀድሞ ታይቷል።');
      return;
    }

    session.wordRevealed = true;
    const { text, keyboard } = buildRevealMessage(session);
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      ...keyboard,
    });
    await ctx.answerCbQuery();
    return;
  }

  if (dataQuery.data === 'reveal:next') {
    if (!session.wordRevealed) {
      await ctx.answerCbQuery('በመጀመሪያ ቃሉን ያሳዩ።', { show_alert: true });
      return;
    }

    const isLast = session.currentRevealIndex === session.assignments.length - 1;
    if (isLast) {
      session.stage = 'voting';
      session.currentVoterIndex = 0;
      const voteMessage = buildVoteMessage(session);

      await ctx.editMessageText(
        `✅ ቃሉ ለሁሉም ተጫዋቾች ተቀርቧል። ድምጽ መስጠት ይጀምሩ።`,
        { parse_mode: 'HTML' },
      );

      await ctx.telegram.sendMessage(chatId, voteMessage.text, {
        parse_mode: 'HTML',
        ...voteMessage.keyboard,
      });
    } else {
      session.currentRevealIndex += 1;
      session.wordRevealed = false;
      const { text, keyboard } = buildRevealMessage(session);
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        ...keyboard,
      });
    }

    await ctx.answerCbQuery();
  }
};

const handleVotingCallbacks = async (ctx: CallbackContext) => {
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) {
    await ctx.answerCbQuery();
    return;
  }

  const dataQuery = callbackQuery as CallbackQuery.DataQuery;

  const chatId = dataQuery.message?.chat.id;
  if (typeof chatId === 'undefined') {
    await ctx.answerCbQuery();
    return;
  }

  const session = getSession(chatId);

  if (session.stage !== 'voting') {
    await ctx.answerCbQuery();
    return;
  }

  const data = dataQuery.data;
  const [action, type, payload] = data.split(':');

  if (action !== 'vote') {
    await ctx.answerCbQuery();
    return;
  }

  if (type === 'select') {
    const index = Number(payload);
    if (!Number.isInteger(index) || index < 0 || index >= session.assignments.length) {
      await ctx.answerCbQuery('ያልተፈቀደ ምርጫ።');
      return;
    }

    session.votes[session.currentVoterIndex] = index;
    const voteMessage = buildVoteMessage(session);

    await ctx.editMessageText(voteMessage.text, {
      parse_mode: 'HTML',
      ...voteMessage.keyboard,
    });
    await ctx.answerCbQuery('የመጀመሪያው ምርጫ ተመዝግቧል።');
    return;
  }

  if (type === 'confirm') {
    if (session.votes[session.currentVoterIndex] === -1) {
      await ctx.answerCbQuery('ማንን እንደምትጠሩ በመጀመሪያ ይምረጡ።', {
        show_alert: true,
      });
      return;
    }

    const isLastVoter =
      session.currentVoterIndex === session.assignments.length - 1;

    if (isLastVoter) {
      session.stage = 'result';
      const resultMessage = createResultMessage(session);

      await ctx.editMessageText('✅ ድምጾች እስካሁን ተሰብስበዋል።', {
        parse_mode: 'HTML',
      });
      await ctx.telegram.sendMessage(chatId, resultMessage, {
        parse_mode: 'HTML',
      });
      await ctx.telegram.sendMessage(
        chatId,
        '🔁 አዲስ ጨዋታ ለመጀመር /newgame ይጠቀሙ።',
      );
      return;
    }

    session.currentVoterIndex += 1;
    const voteMessage = buildVoteMessage(session);

    await ctx.editMessageText('✅ ድምጽ ተመዝግቧል! ቀጣይ ተጫዋችን እንጠብቅ።', {
      parse_mode: 'HTML',
    });
    await ctx.telegram.sendMessage(chatId, voteMessage.text, {
      parse_mode: 'HTML',
      ...voteMessage.keyboard,
    });
    await ctx.answerCbQuery();
  }
};

bot.on('callback_query', async (ctx) => {
  const callbackQuery = ctx.callbackQuery;
  const data = callbackQuery && 'data' in callbackQuery ? (callbackQuery as CallbackQuery.DataQuery).data ?? '' : '';

  if (data.startsWith('reveal:')) {
    await handleRevealCallbacks(ctx);
    return;
  }

  if (data.startsWith('vote:')) {
    await handleVotingCallbacks(ctx);
    return;
  }

  await ctx.answerCbQuery();
});

bot.catch((error, ctx) => {
  console.error('Telegram bot error:', error);
  ctx.reply('ይቅርታ፣ ችግኝ ተከስቷል። እባክዎን እንደገና ይሞክሩ።').catch(() => {
    // ignore secondary errors
  });
});

bot.launch().then(() => {
  console.log('🤖 Amharic Imposter Telegram bot started successfully.');
  if (!process.env.BOT_TOKEN) {
    console.warn('BOT_TOKEN is not set; the bot will not function without it.');
  }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

