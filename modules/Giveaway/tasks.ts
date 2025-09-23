import {
	Client,
	TextChannel,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle, EmbedBuilder,
} from "discord.js";
import QueryBuilder from "@utils/database";
import { Logging } from "@utils/logging";
import { getRandomElement } from "@utils/random";
import { getEnv } from "@utils/env";
import { Color } from "@enums/ColorEnum";

export default class Tasks {
	private readonly client: Client;

	constructor(client: Client) {
		this.client = client;

		setInterval(() => {
			this.task().catch(console.error);
		}, 5000);
	}

	async task(): Promise<void> {
		const result = await QueryBuilder
			.select("giveaways")
			.where({
				actief: 1
			})
			.get();

		const now = new Date();

		for (const giveaway of result) {
			const giveawayDate = new Date(giveaway.giveaway_at);

			// Early continue if the giveaway hasn't ended yet
			if (giveawayDate > now) continue;

			Logging.info(`Giveaway with the price: "${giveaway.prijs}" has ended!`);

			const channel = await this.client.channels.fetch(getEnv("GIVEAWAY") as string) as TextChannel;
			const message = await channel.messages.fetch(giveaway.bericht_id);

			if (message.components.length > 0) {
				const disabledComponents = message.components.map(row => {
					// @ts-ignore
					const actionRow = ActionRowBuilder.from(row);
					actionRow.components.forEach(component => {
						if (component instanceof ButtonBuilder) {
							component.setDisabled(true);
						}
					});
					return actionRow;
				});

				// @ts-ignore
				await message.edit({ components: disabledComponents });
			}

			// Get participants
			const allParticipants = await QueryBuilder
				.select("giveaway_participants")
				.where({ giveaway_id: giveaway.id })
				.get();

			const participants = allParticipants.map((p: { user_id: string; }) => p.user_id);

			// @ts-ignore
			const winnerId: string = getRandomElement(participants);

			// Mark giveaway as inactive
			await QueryBuilder
				.update("giveaways")
				.set({ actief: 0 })
				.where({ id: giveaway.id })
				.execute();

			// Send notification
			const user = await this.client.users.fetch(winnerId as string);

			const embed = new EmbedBuilder()
				.setColor(Color.Blue)
				.setTitle(`${user.displayName}, je hebt de giveaway gewonnen!`)
				.setDescription(`Veel plezier met "${giveaway.prijs}"!\nClaim het binnen 48 uur door op de knop met 🎁 te klikken.`)

			const claimRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId(`claim_giveaway_${giveaway.id}_${winnerId}`)
					.setLabel("🎁")
					.setStyle(ButtonStyle.Success)
			);

			await channel.send({
				content: `<@${winnerId}>`,
				embeds: [embed],
				components: [claimRow]
			});
		}
	}
}
