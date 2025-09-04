import { Client, TextChannel } from 'discord.js';

export default class Tasks {
	private client: Client;

    constructor(client: Client) {
		this.client = client;
	}
}
