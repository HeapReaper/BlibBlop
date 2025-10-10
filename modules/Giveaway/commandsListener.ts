import {
	Client,
	Events,
	MessageFlags,
	ChatInputCommandInteraction,
	ButtonStyle,
	ButtonBuilder,
	ActionRowBuilder,
	EmbedBuilder,
	TextChannel
} from "discord.js";
import QueryBuilder from "@utils/database";
import { Logging } from "@utils/logging";
import { Color } from "@enums/ColorEnum";
import { getEnv } from "@utils/env";
import { LogToServer } from "@utils/logToServer";
import {getRandomElement} from "@utils/random.ts";

export default class CommandsListener {
	private readonly client: Client;

	constructor(client: Client) {
		this.client = client;
		void this.commandsListener();
	}

	async commandsListener(): Promise<void> {
		this.client.on(Events.InteractionCreate, async (interaction): Promise<void> => {
			if (!interaction.isChatInputCommand()) return;

			const { commandName } = interaction;
			const subCommandName: string | null = interaction.options.getSubcommand(true);

			if (commandName !== "giveaway") return;

			switch (subCommandName) {
				case "aanmaken":
					await this.create(interaction);
					break;
				case "verwijder":
					await this.delete(interaction);
					break;
				case "reroll":
					await this.reroll(interaction);
					break;
				case "lijst":
					await this.list(interaction);
					break;
			}
		});

		this.client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isButton()) return;
			if (interaction.customId !== "enter_giveaway") return;

			const message = interaction.message;
			const embed = message.embeds[0];

			if (!embed) return;

			const fields = embed.fields.map(f => ({ ...f }));
			const deelnemersFieldIndex = fields.findIndex(f => f.name === "Aantal deelnames");

			if (deelnemersFieldIndex === -1) return;

			// Get giveaway ID with the message id
			const result = await QueryBuilder
				.select("giveaways")
				.where({
					bericht_id: message.id
				})
				.first();

			if (!result) return;

			// Check if user already participate, if yes return error
			const ifExists = await QueryBuilder
				.select("giveaway_participants")
				.where({
					giveaway_id: result.id,
					user_id: interaction.user.id
				})
				.count()
				.first();

			if (ifExists["COUNT(*)"] > 0) {
				await interaction.reply({
					content: 'Je doet al mee aan deze giveaway!',
					flags: [MessageFlags.Ephemeral]
				});

				return;
			}

			// Add user as a participant to the giveaway table
			await QueryBuilder
				.insert("giveaway_participants")
				.values({
					giveaway_id: result.id,
					user_id: interaction.user.id
				})
				.execute();

			const currentCount = parseInt(fields[deelnemersFieldIndex].value);
			fields[deelnemersFieldIndex].value = `${currentCount + 1}`;

			const updatedEmbed = EmbedBuilder.from(embed)
				.setFields(fields);

			await message.edit({ embeds: [updatedEmbed] });

			await interaction.reply({
				content: "Je doet mee aan de giveaway!",
				flags: [MessageFlags.Ephemeral]
			});
		});

		this.client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isButton()) return;

			const managementChannel = await this.client.channels.fetch(getEnv("BESTUUR") as string) as TextChannel;

			if (interaction.customId.startsWith("claim_giveaway_")) {
				const parts = interaction.customId.split("_");
				const giveawayId = parts[2];
				const winnerId = parts[3];

				// Only real winner can click
				if (interaction.user.id !== winnerId) {
					await interaction.reply({
						content: "❌ Je bent niet de winnaar van deze giveaway!",
						flags: [MessageFlags.Ephemeral]
					});
					return;
				}

				const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
					// @ts-ignore
					ButtonBuilder.from(interaction.component as ButtonBuilder).setDisabled(true)
				);

				await interaction.update({
					content: `🎉 <@${winnerId}> heeft de prijs geclaimd!`,
					components: [disabledRow]
				});

				await QueryBuilder.update("giveaway_participants")
					.set({
						winner: 1
					})
					.where({
						giveaway_id: giveawayId,
						user_id: interaction.user.id
					})
					.execute();

				const msg = await interaction.message.fetch();

				await managementChannel.send({
					content: `Gebruiker <@${winnerId}> heeft de prijs geclaimd! ${msg.url}`
				});
			}
		});
	}

	async create(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.isCommand()) return;

		await LogToServer.info(
			"Command gebruikt",
			[
				{ name: "Command", value: '`/giveaway aanmaken`'},
				{ name: "Wie", value: `<@${interaction.user.id}>`}
			]
		);

		const dag: number = interaction.options.getInteger("dag", true);
		const maand: number = interaction.options.getInteger("maand", true);
		const jaar: number = interaction.options.getInteger("jaar", true);
		const tijd: string = interaction.options.getString("tijd", true);
		const aantal_winnaars: number = interaction.options.getInteger("aantal_winnaars", true);
		const prijs: string = interaction.options.getString("prijs", true);
		const voorwaarden: string = interaction.options.getString("extra_voorwaarden", true);
		const vermeld_iedereen: boolean = interaction.options.getBoolean("vermeld_iedereen", true);
		const formattedDate: string = `${jaar}-${maand.toString().padStart(2,'0')}-${dag.toString().padStart(2,'0')} ${tijd}:00`;
		const date = new Date(formattedDate);
		const unixTimestamp: number = Math.floor(date.getTime() / 1000);

		if (isNaN(date.getTime())) {
			Logging.error("Ongeldige datum!");
			return;
		}

		if (aantal_winnaars === 0 || aantal_winnaars > 1) {
			await interaction.reply({
				content: "Maximaal aantal winnaars is 1 en minimaal 1",
				flags: [MessageFlags.Ephemeral]
			});

			return;
		}

		try {
			const result = await QueryBuilder
				.insert("giveaways")
				.values({
					giveaway_at: formattedDate,
					aantal_winnaars: aantal_winnaars,
					prijs: prijs,
					extra_voorwaarden: voorwaarden,
				})
				.execute();

			await interaction.reply({
				// @ts-ignore
				content: "Giveaway aangemaakt met het id: " + result.insertId,
				flags: [MessageFlags.Ephemeral]
			})

			// @ts-ignore
			await this.sendGiveawayEmbed(interaction, aantal_winnaars, prijs, voorwaarden, vermeld_iedereen, result.insertId, unixTimestamp);
		} catch (error) {
			Logging.error(`Error inside giveaway command listener create: ${error}`);
			await interaction.reply({ content: "Oops, er ging iets mis!", flags: [MessageFlags.Ephemeral] });
		}

	}

	async delete(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.isCommand()) return;

		await LogToServer.info(
			"Command gebruikt",
			[
				{ name: "Command", value: '`/giveaway verwijder`'},
				{ name: "Wie", value: `<@${interaction.user.id}>`}
			]
		);

		const channel = await this.client.channels.fetch(getEnv("GIVEAWAY") as string) as TextChannel;
		const id: string = interaction.options.getString("id", true);

		const result = await QueryBuilder
			.select("giveaways")
			.where({
				id: id
			})
			.first();

		if (!result) {
			await interaction.reply({
				content: "Ik heb geen giveaway gevonden met dat ID!",
				flags: [MessageFlags.Ephemeral]
			});

			return;
		}

		try {
			await channel.messages.delete(result.bericht_id);
		} catch (error) {
			Logging.error(`Error inside giveaway command listener delete: ${error}`);
			return;
		}

		await QueryBuilder
			.delete("giveaways")
			.where({
				id: id
			})
			.execute();

		await interaction.reply({
			content: "Giveaway verwijderd!",
			flags: [MessageFlags.Ephemeral]
		});
	}

	async reroll(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.isCommand()) return;

		await LogToServer.info(
			"Command gebruikt",
			[
				{ name: "Command", value: '`/giveaway reroll`'},
				{ name: "Wie", value: `<@${interaction.user.id}>`}
			]
		);

		const id: string = interaction.options.getString("id", true);
		const channel = await this.client.channels.fetch(getEnv("GIVEAWAY") as string) as TextChannel;

		const result = await QueryBuilder
			.select("giveaway_participants")
			.where({
				giveaway_id: id,
				winner: 0,
			})
			.get();

		const participants = result.map((p: { user_id: string; }) => p.user_id);

		// @ts-ignore
		const winnerId: string = getRandomElement(participants);

		// Remove old winner from DB
		await QueryBuilder
			.update("giveaway_participants")
			.set({
				winner: 0
			})
			.where({
				giveaway_id: id,
				winner: 1,
			})
			.execute();

		// Add new winner to DB
		await QueryBuilder
			.update("giveaway_participants")
			.set({
				winner: 0
			})
			.where({
				user_id: winnerId,
			})
			.execute();

		const user = await this.client.users.fetch(winnerId as string);

		const embed = new EmbedBuilder()
			.setColor(Color.Blue)
			.setTitle(`${user.displayName}, je hebt de giveaway gewonnen!`)
			.setDescription(`Veel plezier met "${result.prijs}"!\nClaim het binnen 48 uur door op de knop met 🎁 te klikken.`)

		const claimRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`claim_giveaway_${result.id}_${winnerId}`)
				.setLabel("🎁")
				.setStyle(ButtonStyle.Success)
		);

		await channel.send({
			content: `<@${winnerId}>`,
			embeds: [embed],
			components: [claimRow]
		});
	}

	async list(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.isCommand()) return;

		await LogToServer.info("Command gebruikt",
			[
				{ name: "Command", value: '`/giveaway lijst`'},
				{ name: "Wie", value: `<@${interaction.user.id}>`}
			]
		);

		const result = await QueryBuilder
			.select("giveaways")
			.where({
				actief: 1
			})
			.get();

		const embed: EmbedBuilder = new EmbedBuilder()
			.setTitle("Giveaways");

		for (const giveaway of result) {
			embed.addFields(
				{ name: `[${giveaway.id}] - ${giveaway.prijs}`, value: `Eindigt op: ${giveaway.giveaway_at}` }
			);
		}

		await interaction.reply({
			embeds: [embed],
			flags: [MessageFlags.Ephemeral]
		});
	}

	async sendGiveawayEmbed(interaction: ChatInputCommandInteraction, amount_winners: number, price: string, terms: string, tagEveryone: boolean, giveAwayID: string, unixTimestamp: number): Promise<void> {
		const channel = await this.client.channels.fetch(getEnv("GIVEAWAY") as string) as TextChannel;
		const now = new Date();

		const giveawayEmbed = new EmbedBuilder()
			.setTitle(`${price}`)
			.setDescription(`**Voorwaarden**\n${terms}\nEn druk op de 🎉 hier beneden!`)
			.setColor(Color.Blue)
			.addFields(
				{ name: "Eindigt op", value: `<t:${unixTimestamp}:R>`, inline: false },
				{ name: "Gemaakt door:", value: `<@${interaction.user.id}>`, inline: false },
				{ name: "Aantal deelnames", value: '0', inline: false },
				{ name: "Aantal mogelijke winnaars", value: `${amount_winners}`, inline: false },
			)
			.setFooter({ text: `Aangemaakt op: ${now.toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}` });

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId("enter_giveaway")
				.setLabel("🎉")
				.setStyle(ButtonStyle.Primary)
		);

		const message = await channel.send({
			content: `Giveaway! ${tagEveryone ? "@everyone" : ""}`,
			embeds: [giveawayEmbed],
			components: [row],
		});

		await QueryBuilder
			.update("giveaways")
			.set({
				bericht_id: message.id,
			})
			.where({
				id: giveAwayID
			})
			.execute();
	}
}
