import { Client } from "discord.js";

export default class BumpReminderCommandsListener {
	private client: Client;
	
	constructor(client: Client) {
		this.client = client;
	}
}