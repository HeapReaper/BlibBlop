import { Client, Interaction, Events, MessageFlags} from 'discord.js';
import Database from '@utils/database';
import { Logging } from '@utils/logging';

export default class CommandsListener {
	private client: Client;
	private funnyBlipResponse: string[];

	constructor(client: Client) {
		this.client = client;
		this.funnyBlipResponse = ['Blorp', 'Blup', 'Blib', 'Bloop', 'Blump', 'Blab', 'Blob', 'Blemp']
		void this.commandsListener();
	}
	
	async commandsListener(): Promise<void> {
		this.client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isCommand()) return;

			const { commandName } = interaction;

			if (commandName === 'blip') {
				await interaction.reply(this.funnyBlipResponse[Math.floor(Math.random() * this.funnyBlipResponse.length)]);
			}
		})
	}
}
