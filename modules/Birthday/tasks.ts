import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { Logging } from '@utils/logging';
import QueryBuilder from '@utils/database';
import { getEnv } from '@utils/env.ts';
import cron from 'node-cron';
import {calcAge} from '@utils/age';

export default class Tasks {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
		cron.schedule('0 10 * * *', async (): Promise<void> => {
			Logging.debug('Running Cron "checkBirthdays"');
			void this.checkBirthdays();
		});
	}

	async checkBirthdays(): Promise<void> {
		const now = new Date();

		const birthdays: any[] = await QueryBuilder.select('birthday').get();

		for (const birthday of birthdays) {
			const paredBirthday = new Date(Date.parse(birthday.birthdate));

			if ((paredBirthday.getMonth() + 1) !== (now.getMonth() + 1) && paredBirthday.getDate() !== now.getDate()) {
				continue;
			}

			const user = await this.client.users.fetch(`${birthday.user_id}`);

			const channelToSend = this.client.channels.cache.get(getEnv('GENERAL') as string) as TextChannel;

			if (!channelToSend) {
				Logging.warn('I cannot find channel to send birthday notification to!');
				return;
			}

			const embed = new EmbedBuilder()
				.setColor(0x2563EB)
				.setTitle('RC Garage')
				.setDescription(`Hey ${user},\ngefeliciteerd met ${calcAge(new Date(birthday.birthdate))}e verjaardag!\n🎊💪`)
				.setThumbnail(user.displayAvatarURL())
				.setTimestamp();

			await channelToSend.send({ embeds: [embed] });
		}
	}
}