// @ts-ignore
import express from "express";
import promClient from "prom-client";
import { Logging } from "@utils/logging";
import { userStatussen } from "@utils/usersOnline";
import { getEnv } from "@utils/env";
import {Client, EmbedBuilder} from "discord.js";
import { usersOnline } from "@utils/usersOnline";
import cron from "node-cron";

export async function createWebServer(client: Client, port = 3144) {
  await usersOnline(client);

  const webApp = express();
  const register = new promClient.Registry();
  promClient.collectDefaultMetrics({ register });

  const guildMemberCount = new promClient.Gauge({
    name: "discord_guild_member_count",
    help: "Number of members in the guild (excluding bots)",
  });

  const guildBoostCount = new promClient.Gauge({
    name: "discord_guild_boost_count",
    help: "Number of server boosts for the guild",
  });

  const guildMessageTotal = new promClient.Counter({
    name: "discord_guild_message_total",
    help: "Total number of messages sent in the guild",
    labelNames: ["channel_id", "hour", "day", "month"],
  });

  register.registerMetric(guildMemberCount);
  register.registerMetric(guildBoostCount);
  register.registerMetric(guildMessageTotal);

  // Register the messageCreate listener ONLY ONCE here
  client.on("messageCreate", message => {
    if (!message.guild || message.author.bot) return;
    if (message.guild.id === getEnv("GUILD_ID")) {
      const now = new Date();
      const labels = {
        channel_id: message.channel.id,
        hour: String(now.getHours()).padStart(2, "0"),
        day: String(now.getDate()).padStart(2, "0"),
        month: String(now.getMonth() + 1).padStart(2, "0"),
      };
      guildMessageTotal.inc(labels);
    }
  });

  async function updateGuildMetrics() {
    try {
      const guild = await client.guilds.fetch(getEnv("GUILD_ID") as string);
      if (!guild) {
        Logging.warn("Guild not found in metrics update");
        return;
      }

      await guild.members.fetch();
      const members = guild.members.cache.filter(m => !m.user.bot);
      guildMemberCount.set(members.size);

      guildBoostCount.set(guild.premiumSubscriptionCount || 0);
    } catch (err) {
      Logging.warn(`Error updating guild metrics: ${err}`);
    }
  }

  cron.schedule("* * * * *", async () => {
    await usersOnline(client);
    await updateGuildMetrics();
  });

  // @ts-ignore
  webApp.get("/user-statussen", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(userStatussen);
  });

  // @ts-ignore
  webApp.get("/stats/guild", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");

    try {
      const guild = await client.guilds.fetch(getEnv("GUILD_ID") as string);
      if (!guild) {
        return res.status(404).json({ error: "Guild not found" });
      }

      await guild.members.fetch();
      const members = guild.members.cache.filter(m => !m.user.bot);
      const membersOnline = members.filter(m => m.presence?.status === "idle" || m.presence?.status === "online");

      const lastJoinedMember = members
        .sort((a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0))
        .first();

      const lastJoinedDate = lastJoinedMember?.joinedTimestamp
        ? formatTimestamp(lastJoinedMember.joinedTimestamp).split(" ")[0]
        : null;

      const stats = {
        guildName: guild.name,
        guildId: guild.id,
        membersOnline: membersOnline.size,
        memberCount: members.size,
        boostCount: guild.premiumSubscriptionCount || 0,
        lastJoined: lastJoinedDate,
      };

      res.json(stats);
    } catch (err) {
      Logging.warn(`Error fetching guild stats: ${err}`);
      res.status(500).json({ error: "Failed to fetch guild stats" });
    }
  });

  // @ts-ignore
  webApp.get("/metrics", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });

  webApp.listen(port, () => {
    Logging.info(`API running at http://localhost:${port}`);
  });

  await updateGuildMetrics();
}

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice();
  const h = date.getHours();
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yy} ${h}:${min}`;
}
