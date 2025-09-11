import {
	Client,
	Interaction,
	Events,
	MessageFlags,
	PermissionsBitField,
	EmbedBuilder,
} from "discord.js";
import { Logging } from "@utils/logging";
import QueryBuilder from "@utils/database";
import { Color } from "@enums/ColorEnum";
import { formatDate } from "@utils/formatDate";
import { LogToServer } from "@utils/logToServer.ts";

export default class CommandsListener {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
		void this.commandListener();
	}

	async commandListener(): Promise<void> {
		this.client.on(Events.InteractionCreate, async (interaction: Interaction): Promise<void> => {
			if (!interaction.isCommand()) return;

			const { commandName } = interaction;
			// @ts-ignore
			const subCommandName: string | null = interaction.options.getSubcommand(false); // `false` = required = false

			if (commandName !== "verjaardag") return;

			switch (subCommandName) {
				case "toevoegen":
					void this.birthdayAdd(interaction);
					break;
				case "verwijderen":
					void this.birthdayRemove(interaction);
					break;
				case "lijst":
					void this.birthdayList(interaction);
					break;
			}
		});
	}

	async birthdayAdd(interaction: Interaction): Promise<void> {
		if (!interaction.isCommand()) return;
		Logging.info("Adding a birthday");

		try {
			// @ts-ignore
			if (await QueryBuilder.select("birthday").where({user_id: interaction.user.id}).count().get() !== 0) {
				await interaction.reply({content: "Je hebt jezelf al toegevoegd aan de verjaardag functie!", flags: MessageFlags.Ephemeral});
				return;
			}

			await QueryBuilder
				.insert("birthday")
				.values({
					user_id: interaction.user.id,
					// @ts-ignore
					birthdate: `${interaction.options.getInteger("jaar")}-${interaction.options.getInteger("maand")}-${interaction.options.getInteger("dag")}`
				})
				.execute();

			await LogToServer.info("Verjaardag toegevoegd", [
				{ name: "Gebruiker", value: `<@${interaction.user.id}>` }
			]);

			await interaction.reply({content: "Je verjaardag is in AllDayBot toegevoegd!", flags: MessageFlags.Ephemeral});
		} catch (error) {
			Logging.error(`Error inside commandListener for Birthday: ${error}`);
			await interaction.reply({content: "Er ging iets mis! Het probleem is gerapporteerd aan de developer.", flags: MessageFlags.Ephemeral});
			return;
		}
	}

	async birthdayRemove(interaction: Interaction): Promise<void> {
		if (!interaction.isCommand()) return;
		Logging.info("Deleted a birthday");

		try {
			// @ts-ignore
			if (await QueryBuilder.select("birthday").where({user_id: interaction.user.id}).count().get() === 0) {
				await interaction.reply({content: "Je hebt geen verjaardag in AllDayBot staan!", flags: MessageFlags.Ephemeral});
				return;
			}

			await QueryBuilder
				.delete("birthday")
				.where({user_id: interaction.user.id})
				.execute();

			await LogToServer.info("Verjaardag verwijderd", [
				{ name: "Gebruiker", value: `<@${interaction.user.id}>` }
			]);

			await interaction.reply({content: "Je verjaardag is uit AllDayBot gehaald!", flags: MessageFlags.Ephemeral});
		} catch (error) {
			Logging.error(`Something went wrong while deleting birthday: ${error}`);
			await interaction.reply({content: "Er ging iets mis! Het probleem is gerapporteerd aan de developer.", flags: MessageFlags.Ephemeral});
			return
		}
	}

	async birthdayList(interaction: Interaction): Promise<void> {
		if (!interaction.isCommand()) return;

		if (!interaction.member) {
			await interaction.reply({
				content: "Oeps, er ging iets mis!",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		// @ts-ignore
		if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
			await interaction.reply({
				content: "Oeps, je hebt er geen toegang tot!",
				flags: MessageFlags.Ephemeral,
			});

			return;
		}

		const birthdays = await QueryBuilder
			.select("birthday")
			.execute();

		const embed = new EmbedBuilder()
			.setColor(Color.AeroBytesBlue)
			.setTitle("Verjaardagen")

		for (const birthday of birthdays) {
			const user = await this.client.users.fetch(birthday.user_id);

			embed.addFields({
				name: user ? user.displayName : birthday.user_id,
				value: formatDate(birthday.birthdate),
			})
		}

		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
	}
}