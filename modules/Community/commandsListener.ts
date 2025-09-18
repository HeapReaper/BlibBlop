import {
	Client,
	Interaction,
	Events
} from "discord.js";

export default class CommandsListener {
	private readonly client: Client;
	private readonly funnyBlipResponse: string[];

	constructor(client: Client) {
		this.client = client;
		this.funnyBlipResponse = ["Blorp", "Blup", "Blib", "Bloop", "Blump", "Blab", "Blob", "Blemp"]
		void this.commandsListener();
	}
	
	async commandsListener(): Promise<void> {
		this.client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isCommand()) return;

			const { commandName } = interaction;

			if (commandName === "blip") {
				await interaction.reply(this.funnyBlipResponse[Math.floor(Math.random() * this.funnyBlipResponse.length)]);
			}
		})
	}
}
