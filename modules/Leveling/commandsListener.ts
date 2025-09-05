import {
	Client,
	Interaction,
	Events,
	EmbedBuilder,
} from 'discord.js';
import QueryBuilder from '@utils/database';
import { Color } from '@enums/ColorEnum';
export default class CommandsListener {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
		void this.commandsListener();
	}

	async commandsListener(): Promise<void> {
		this.client.on(Events.InteractionCreate, async (interaction: Interaction): Promise<void> => {
			if (!interaction.isCommand()) return;

			const { commandName } = interaction;
			// @ts-ignore
			const subCommandName: string | null = interaction.options.getSubcommand(true);

			if (commandName !== 'level') return;

			switch (subCommandName) {
				case 'scorebord':
					void this.scoreboard(interaction);
					break;
				case 'profiel':
					void this.profile(interaction);
					break;
			}
		});
	}

	async scoreboard(interaction: Interaction): Promise<void> {
		if (!interaction.isChatInputCommand()) return;

		const dbRes = await QueryBuilder
			.select('leveling')
			.orderBy('level', 'DESC')
			.limit(10)
			.execute();

		const embed = new EmbedBuilder()
			.setTitle('Scoreboard')
			.setColor(Color.Blue)
			.setDescription('Zie de top 10!')

		for (const entry of dbRes) {
			const user = await this.client.users.fetch(entry.user_id);
			embed.addFields({
				name: user ? `${user.displayName}` : 'Niet gevonden',
				value: `Level: ${entry.level} | Xp: ${entry.xp}`
			})
		}

		await interaction.reply({embeds: [embed]});
	}

	async profile(interaction: Interaction): Promise<void> {
		if (!interaction.isChatInputCommand()) return;

		const dbRes = await QueryBuilder
			.select('leveling')
			.where({
				user_id: interaction.user.id
			})
			.first();

		const embed = new EmbedBuilder()
			.setTitle('Profiel')
			.setColor(Color.Blue)
			.addFields(
				{ name: 'XP', value: `${dbRes.xp ?? '0'}` },
				{ name: 'Level', value: `${dbRes.level ?? '0'}` },
			)

		await interaction.reply({embeds: [embed]});
	}
}
