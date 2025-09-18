import { Client } from "discord.js";

export default class BumpReminderCommands {
	private client: Client;
	
	constructor(client: Client) {
		this.client = client;
	}
}