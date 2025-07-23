import { Client, Interaction, Events, MessageFlags} from 'discord.js';
import { Logging } from '@utils/logging';
import QueryBuilder from '@utils/database';

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

			if (commandName !== 'verjaardag') return;

			switch (subCommandName) {
				case 'toevoegen':
					void this.birthdayAdd(interaction);
					break;
				case 'verwijderen':
					void this.birthdayRemove(interaction);
					break;
			}
		});
	}

	async birthdayAdd(interaction: Interaction): Promise<void> {
		if (!interaction.isCommand()) return;
		Logging.info('Adding a birthday');

		try {
			// @ts-ignore
			if (await QueryBuilder.select('birthday').where({user_id: interaction.user.id}).count().get() !== 0) {
				await interaction.reply({content: 'Je hebt jezelf al toegevoegd aan de verjaardag functie!', flags: MessageFlags.Ephemeral});
				return;
			}

			await QueryBuilder
				.insert('birthday')
				.values({
					user_id: interaction.user.id,
					// @ts-ignore
					birthdate: `${interaction.options.getInteger('jaar')}-${interaction.options.getInteger('maand')}-${interaction.options.getInteger('dag')}`
				})
				.execute();

			await interaction.reply({content: 'Je verjaardag is in AllDayBot toegevoegd!', flags: MessageFlags.Ephemeral});
		} catch (error) {
			Logging.error(`Error inside commandListener for Birthday: ${error}`);
			await interaction.reply({content: 'Er ging iets mis! Het probleem is gerapporteerd aan de developer.', flags: MessageFlags.Ephemeral});
			return;
		}
	}

	async birthdayRemove(interaction: Interaction): Promise<void> {
		if (!interaction.isCommand()) return;
		Logging.info('Deleted a birthday');

		try {
			// @ts-ignore
			if (await QueryBuilder.select('birthday').where({user_id: interaction.user.id}).count().get() === 0) {
				await interaction.reply({content: 'Je hebt geen verjaardag in AllDayBot staan!', flags: MessageFlags.Ephemeral});
				return;
			}

			await QueryBuilder
				.delete('birthday')
				.where({user_id: interaction.user.id})
				.execute();

			await interaction.reply({content: 'Je verjaardag is uit AllDayBot gehaald!', flags: MessageFlags.Ephemeral});
		} catch (error) {
			Logging.error(`Something went wrong while deleting birthday: ${error}`);
			await interaction.reply({content: 'Er ging iets mis! Het probleem is gerapporteerd aan de developer.', flags: MessageFlags.Ephemeral});
			return
		}
	}
}