import express from 'express';
import promClient from 'prom-client';
import { Logging } from '@utils/logging';
import { userStatussen } from '@utils/usersOnline';
import { getEnv } from '@utils/env';
import { Client } from 'discord.js';
import { usersOnline } from '@utils/usersOnline';
import cron from 'node-cron';

export async function createWebServer(client: Client, port = 3144) {
  await usersOnline(client);

  const webApp = express();
  const register = new promClient.Registry();
  promClient.collectDefaultMetrics({ register });

  const guildMemberCount = new promClient.Gauge({
    name: 'discord_guild_member_count',
    help: 'Number of members in the guild (excluding bots)',
  });

  const guildBoostCount = new promClient.Gauge({
    name: 'discord_guild_boost_count',
    help: 'Number of server boosts for the guild',
  });

  const guildMessageTotal = new promClient.Counter({
    name: 'discord_guild_message_total',
    help: 'Total number of messages sent in the guild',
    labelNames: ['channel_id', 'hour', 'day', 'month'],
  });

  register.registerMetric(guildMemberCount);
  register.registerMetric(guildBoostCount);
  register.registerMetric(guildMessageTotal);

  async function updateGuildMetrics() {
    try {
      const guild = await client.guilds.fetch(getEnv('GUILD_ID') as string);
      if (!guild) {
        Logging.warn('Guild not found in metrics update');
        return;
      }

      await guild.members.fetch();
      const members = guild.members.cache.filter(m => !m.user.bot);
      guildMemberCount.set(members.size);

      client.on('messageCreate', message => {
        if (!message.guild || message.author.bot) return;
        if (message.guild.id === getEnv('GUILD_ID')) {
          const now = new Date();
          const labels = {
            channel_id: message.channel.id,
            hour: String(now.getHours()).padStart(2, '0'),
            day: String(now.getDate()).padStart(2, '0'),
            month: String(now.getMonth() + 1).padStart(2, '0'),
          };
          guildMessageTotal.inc(labels);
        }
      });

      guildBoostCount.set(guild.premiumSubscriptionCount || 0);
    } catch (err) {
      Logging.warn(`Error updating guild metrics: ${err}`);
    }
  }

  cron.schedule('* * * * *', async () => {
    await usersOnline(client);
    await updateGuildMetrics();
  });

  webApp.get('/user-statussen', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(userStatussen);
  });

  webApp.get('/metrics', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  webApp.listen(port, async () => {
    Logging.info(`API running at http://localhost:${port}`);
    await countAllExistingMessages(client, guildMessageTotal);
  });

  await updateGuildMetrics();
}

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const h = date.getHours();
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yy} ${h}:${min}`;
}

async function countAllExistingMessages(client: Client, guildMessageTotal: promClient.Counter) {
  const guild = await client.guilds.fetch(getEnv('GUILD_ID') as string);
  await guild.channels.fetch();

  for (const channel of guild.channels.cache.values()) {
    if (!channel.isTextBased() || !channel.viewable) continue;

    Logging.info(`Fetching messages from #${channel.name}...`);

    let lastId: string | undefined;
    let fetchedCount = 0;

    while (true) {
      const options: any = { limit: 100 };
      if (lastId) options.before = lastId;

      const messages = await channel.messages.fetch(options);
      if (messages.size === 0) break;

      messages.forEach(message => {
        if (!message.author.bot) {
          const msgDate = new Date(message.createdTimestamp);
          const labels = {
            channel_id: message.channel.id,
            hour: String(msgDate.getHours()).padStart(2, '0'),
            day: String(msgDate.getDate()).padStart(2, '0'),
            month: String(msgDate.getMonth() + 1).padStart(2, '0'),
          };
          guildMessageTotal.inc(labels);
          fetchedCount++;
        }
      });

      lastId = messages.last()?.id;
      if (!lastId) break;

      await new Promise(res => setTimeout(res, 1000)); // prevent hitting rate limit
    }

    Logging.info(`Fetched ${fetchedCount} messages from #${channel.name}`);
  }
}

