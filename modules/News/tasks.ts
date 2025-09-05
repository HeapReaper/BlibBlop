import {
	Client,
	EmbedBuilder,
	TextChannel
} from 'discord.js';
import cron from 'node-cron';
import { getEnv } from '@utils/env';
import { Logging } from '@utils/logging';

export default class Tasks {
	private client: Client;
	private lastArticleId = null;

	constructor(client: Client) {
		this.client = client;
		void this.task()

		cron.schedule('* * * * *', async () => {
			await this.task();
		})
	}

	async task() {
		Logging.info('Checking if a new article has been posted on the site...');

		try {
			const response = await fetch('https://strapi.rc-garage.nl/api/articles?populate=*&sort=createdAt:desc&pagination[limit]=1');
			const json = await response.json();
			const article = json.data[0];

			if (!article || article === 0) return;

			const articleId = article.id;

			if (this.lastArticleId === null) {
				this.lastArticleId = articleId;
				return;
			}

			if (articleId === this.lastArticleId) return;

			this.lastArticleId = articleId;

			const newsChannel = await this.client.channels.fetch(getEnv('NEWS') as string) as TextChannel;

			if (!newsChannel) return;

			const embed = new EmbedBuilder()
				.setTitle(article.title)
				.setDescription(`${article.description}... [Lees verder](https://rc-garage.nl/nieuws/${article.slug})`)
				.setURL(`https://rc-garage.nl/nieuws/${article.slug}`)
				.setColor(0x3b82f6)
				.setTimestamp(new Date(article.createdAt))
				.setFooter({ text: `Categorie: ${article.category.name}` })
				.setImage(`https://strapi.rc-garage.nl${article.cover.url}`);

			await newsChannel.send({ embeds: [embed]})
		} catch (error) {
			Logging.error(`${error}`);
		}
	}
}
