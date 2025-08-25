import {
	Client,
	TextChannel,
	EmbedBuilder
} from 'discord.js';
import cron from 'node-cron';
import {Logging} from '@utils/logging';
import {getEnv} from '@utils/env';
import QueryBuilder from '@utils/database';
import { Color } from '@enums/ColorEnum';

export default class Tasks {
	private client: Client;

    constructor(client: Client) {
			this.client = client;
			cron.schedule('30 18 28-31 * *', async () => { // 18:30 every end of the month
				const today = new Date();
				const tomorrow = new Date(today);
				tomorrow.setDate(today.getDate() + 1);

				if (tomorrow.getDate() !== 1) return;

				await this.endOfPhotoContestVoting();
			});
	}

	async endOfPhotoContestVoting() {
		Logging.info('Vote time for "foto-webstrijd"!');

		const pictureContestChannel = await this.client.channels.fetch(getEnv('PHOTO_CONTEST') as string) as TextChannel;
		const announcementChannel = await this.client.channels.fetch(getEnv('ANNOUNCEMENT') as string) as TextChannel;

		if (!pictureContestChannel) {
			Logging.error('PictureContestChannel not found in "endOfPhotoContestVoting"');
			return;
		}

		const voteMessages = await QueryBuilder
		// @ts-ignore
			.raw(`
				SELECT
					message_id,
					COUNT(*) AS votes
				FROM votes
				WHERE vote_name = 'foto-wedstrijd'
					AND YEAR(created_at) = YEAR(CURDATE())
					AND MONTH(created_at) = MONTH(CURDATE())
				GROUP BY message_id
				ORDER BY votes DESC;
			`)
			.execute();

		for (const vote of voteMessages) {
			try {
				const message = await pictureContestChannel.messages.fetch(vote.message_id);
				const firstImage = message.attachments.find(att => att.contentType?.startsWith('image/'));
				const imageUrl = firstImage?.url ?? message.embeds.find(embed => embed.image?.url)?.image?.url;

				if (!imageUrl) {
					Logging.warn('No image found in "endOfPhotoContestVoting"');
				}

				const embed = new EmbedBuilder()
					.setTitle('🏆 Foto Wedstrijd Winnaar!')
					.setDescription(`Gefeliciteerd <@${message.author.id}>! 🎉\nJouw foto heeft de meeste stemmen gekregen!\nHij zal binnenkort verschijnen op onze [website](https://rc-garage.nl)!`)
					.setColor(Color.Blue)
					.setImage(imageUrl!)
					.setFooter({ text: 'RC Garage foto wedstrijd' })
					.setTimestamp();

				await pictureContestChannel.send({ embeds: [embed] });
				await announcementChannel.send({ embeds: [embed] });
				Logging.info('Found picture contest winner!');
				break;
			} catch (error) {
				Logging.warn(`Could not fetch message ${vote.message_id}`);
			}
		}
	}
}
