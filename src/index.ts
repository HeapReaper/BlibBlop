import {
	Client,
	GatewayIntentBits,
	Partials,
	Events as DiscordEvents, TextChannel,
	ActivityType,
} from "discord.js";
import loadModules from "@utils/moduleLoader";
import { Logging } from "@utils/logging";
import { getEnv } from "@utils/env";
import { runMigrations } from "@utils/migrations.ts";
import QueryBuilder from "@utils/database.ts";
import * as process from "node:process";
import { LogToServer } from "@utils/logToServer.ts";
import { createWebServer } from "@utils/api";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates,
	],
	partials: [
		Partials.Message,
		Partials.Channel,
		Partials.Reaction,
		Partials.User,
	],
});

client.on(DiscordEvents.ClientReady, async client => {
	client.setMaxListeners(20)
	const guild = await client.guilds.fetch(getEnv("GUILD_ID") as string);
	const logChannel = await guild.channels.fetch(getEnv("LOG") as string) as TextChannel;

	LogToServer.init(logChannel);

	// Set activity
	client.user.setActivity("/ticket om beheer te contacteren", { type: ActivityType.Listening});

	// Load modules
	try {
		await loadModules(client);
	} catch (error) {
		Logging.error(`Error while loading modules: ${error}`);
	}

	// Run migrations
	try {
		await runMigrations();
	} catch (error) {
		Logging.error(`Error while running migrations: ${error}`);
	}

	// Keeping DB active
	setInterval(async () => {
		Logging.debug("Keeping the database connection active...");
		await QueryBuilder.select("migrations").limit(1).execute();
	}, 10000);

	// Error handling
	process.on("uncaughtException", error =>
		Logging.error(`Uncaught Exception: ${error.stack ?? error}`)
	);
	process.on("unhandledRejection", reason =>
		Logging.error(`Unhandled Rejection: ${reason instanceof Error ? reason.stack : reason}`)
	);

	const webApp = await createWebServer(client, 3144);

  // Load modules + API
  try {
    const apiModules = await loadModules(client);

    for (const registerApi of apiModules) {
      registerApi(webApp, client);
    }
  } catch (error) {
    Logging.error(`Error while loading modules: ${error}`);
  }

	Logging.info(`Client ready! Signed in as ${client.user.tag}!`);
});

void client.login(getEnv("DISCORD_TOKEN"));
