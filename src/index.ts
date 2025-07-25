import {Client, GatewayIntentBits, Partials,} from 'discord.js';
import loadModules from '@utils/moduleLoader';
import {Logging} from '@utils/logging';
import {getEnv} from '@utils/env';
import {runMigrations} from '@utils/migrations.ts';
import QueryBuilder from '@utils/database.ts';
import * as process from 'node:process';
// @ts-ignore
import express from 'express';
import cron from 'node-cron';
import { userStatussen, usersOnline } from '@utils/usersOnline';

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

const webApp = express();
const PORT = 3144;

webApp.get('/user-statussen', (req: any, res: any) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.json(userStatussen);
});

webApp.get('/stats/guild', async (req: any, res: any) => {
	// Todo: make it update a exteral var once every minute
	try {
		res.setHeader('Access-Control-Allow-Origin', '*');

		const guild = await client.guilds.fetch(getEnv('GUILD_ID') as string);

		if (!guild) return Logging.warn('Guild not found in index.ts stats/guild');

		await guild.members.fetch();

		const members = guild.members.cache.filter(member => !member.user.bot);
		// @ts-ignore
		const memberCount = members.size;
		const onlineMembers = members.filter(member => member.presence?.status === 'online').size;

		// @ts-ignore
		const lastJoined = members.reduce((latest, member) => {
			// @ts-ignore
			if (!latest || (member.joinedAt && member.joinedAt > latest.joinedAt)) {
				return member;
			}
			return latest;
		}, null);

		res.json({
			memberCount: memberCount,
			membersOnline: onlineMembers,
			// @ts-ignore
			lastJoined: formatTimestamp(lastJoined?.joinedTimestamp),
			boostCount: guild.premiumSubscriptionCount,
		});
	} catch (error) {
		Logging.warn(`Error in "/stats/guild/": ${error}`);
	}

})

webApp.listen(PORT, () => {
	Logging.info(`API running at http://localhost:${PORT}`);
});


client.on('ready', async client => {
	await usersOnline(client);

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

cron.schedule('* * * * *', async (): Promise<void> => {
	await usersOnline(client);
})

function formatTimestamp(timestamp: any) {
	const date = new Date(timestamp);
	const dd = String(date.getDate()).padStart(2, '0');
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const yy = String(date.getFullYear()).slice(-2);
	const h = date.getHours();
	const min = String(date.getMinutes()).padStart(2, '0');

	return `${dd}-${mm}-${yy} ${h}:${min}`;
}


void client.login(getEnv('DISCORD_TOKEN'));