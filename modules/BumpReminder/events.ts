import {Client, TextChannel} from "discord.js";

export default class BumpReminderEvents {
	private client: Client;
	
	constructor(client: Client) {
		this.client = client;
	}
}