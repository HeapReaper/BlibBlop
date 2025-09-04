import { Client, Interaction, Events, MessageFlags} from 'discord.js';
import Database from '@utils/database';
import { Logging } from '@utils/logging';

export default class CommandsListener {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
		void this.commandsListener();
	}
	
	async commandsListener(): Promise<void> {
		//
	}
}
