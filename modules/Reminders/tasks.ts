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

		// Runs one time a day at 19:00
		cron.schedule('0 19 * * *', async () => {
			void this.disboardReview();
		});

		// Runs on monday, wednesday and friday at 20:00
		cron.schedule('0 20 * * Mon,Wed,Fri', async () => {
			void this.voteReminder();
		})
	}

	async disboardReview() {
		const embed = new EmbedBuilder()
			.setColor(0x2563EB)
			.setTitle('RC Garage Herinnering')
			.setDescription('Heb jij al een review achtergelaten op [Disboard](https://disboard.org/nl/server/1350811442856726559) of [Top.GG](https://top.gg/discord/servers/744654584256151552#reviews)?\nJe helpt de server daarmee groeien!')

		await this.generalChannel.send({ embeds: [embed] });
	}

	async voteReminder() {
		const embed = new EmbedBuilder()
			.setColor(0x2563EB)
			.setTitle('RC Garage Herinnering')
			.setDescription(`Heb jij al gestemd in <#1379143853293961346> of <#1395819707424047124>?\nAan het einde van de maand wordt de winnaar bekendgemaakt!`)

		await this.generalChannel.send({ embeds: [embed] });
	}
}
