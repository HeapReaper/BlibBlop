import {ActivityType, Client, GatewayIntentBits, Partials,} from 'discord.js';
import loadModules from '@utils/moduleLoader';
import {Logging} from '@utils/logging';
import {getEnv} from '@utils/env';
import {runMigrations} from '@utils/migrations.ts';
import QueryBuilder from '@utils/database.ts';
import * as process from "node:process";
import S3OperationBuilder from "@utils/s3.ts";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
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

client.on('ready', async client => {
	console.log(await S3OperationBuilder.setBucket(getEnv('S3_BUCKET_NAME') as string).status())

	try {
		await loadModules(client);

	} catch (error) {
		Logging.error(`Error while loading modules: ${error}`);
	}

	try {
		await runMigrations();
	} catch (error) {
		Logging.error(`Error while running migrations: ${error}`);
	}

	try {
		setInterval(async (): Promise<void> => {
			Logging.debug('Keeping the database connection active in index.ts...');
			await QueryBuilder.select('migrations').limit(1).execute();
		}, 10000);
	} catch (error) {
		Logging.error(`Error while keeping the DB active: ${error}`);
	}

	process.on('uncaughtException', async (error: Error): Promise<void> => {
		Logging.error(`Uncaught Exception: ${error.stack ?? error}`);
	})

	process.on('unhandledRejection', async (reason: any): Promise<void> => {
		Logging.error(`Unhandled Rejection: ${reason instanceof Error ? reason.stack : reason}`);
	});
	
	Logging.info(`Client ready! Signed in as ${client.user.tag}!`);
})

void client.login(getEnv('DISCORD_TOKEN'));