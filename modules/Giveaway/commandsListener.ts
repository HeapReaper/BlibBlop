import {
	Client,
	Interaction,
	Events,
	MessageFlags,
	ChatInputCommandInteraction
} from "discord.js";

export default class CommandsListener {
	private readonly client: Client;

	constructor(client: Client) {
		this.client = client;
		void this.commandsListener();
	}

	async commandsListener(): Promise<void> {
		this.client.on(Events.InteractionCreate, async (interaction: ChatInputCommandInteraction): Promise<void> => {
				if (!interaction.isCommand()) return;

				const { commandName } = interaction;
				const subCommandName: string | null = interaction.options.getSubcommand(true);

				if (commandName !== "giveaway") return;

				switch (subCommandName) {
					case "aanmaken":
						void this.create(interaction);
						break;
					case "verwijder":
						void this.delete(interaction);
						break;
					case "reroll":
						void this.reroll(interaction);
						break;
					case "lijst":
						void this.list(interaction);
						break;
				}
			}
		);
	}

	async create(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.isCommand()) return;

		const dag: number = interaction.options.getInteger("dag", true);
		const maand: number = interaction.options.getInteger("maand", true);
		const jaar: number = interaction.options.getInteger("jaar", true);
		const tijd: string = interaction.options.getString("tijd", true);
		const aantal_winnaars: number = interaction.options.getInteger("aantal_winnaars", true);
		const prijs: string = interaction.options.getString("prijs", true);

		//
	}

	async delete(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.isCommand()) return;

		const id: string = interaction.options.getString("id", true);
		//
	}

	async reroll(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.isCommand()) return;

		const id: string = interaction.options.getString("id", true);
		//
	}

	async list(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.isCommand()) return;
		//
	}
}
