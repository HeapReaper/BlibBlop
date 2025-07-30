import {
	Client,
	EmbedBuilder,
	TextChannel
} from 'discord.js';
import cron from 'node-cron';
import { getEnv } from '@utils/env';

export default class Tasks {
	private client: Client;
	private generalChannel: TextChannel;

	constructor(client: Client) {
		this.client = client;
		this.generalChannel = this.client.channels.cache.get(getEnv('GENERAL') as string) as TextChannel;

		cron.schedule('0 19 * * *', async () => {
			void this.disboardReview();
		});
	}

	async disboardReview() {
		const embed = new EmbedBuilder()
			.setColor(0x2563EB)
			.setTitle('RC Garage Herinnering')
			.setDescription('Heb jij al een review achtergelaten op [Disboard](https://disboard.org/nl/server/1350811442856726559)? Je helpt de server daarmee groeien en nog meer RC-liefhebbers bereiken!')

		await this.generalChannel.send({ embeds: [embed] });
	}
}
