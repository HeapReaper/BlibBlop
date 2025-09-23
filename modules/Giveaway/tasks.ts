import {
	Client,
	TextChannel
} from "discord.js";
import QueryBuilder from "@utils/database";
import cron from "node-cron";

export default class Tasks {
	private readonly client: Client;

  constructor(client: Client) {
		this.client = client;
		// Add cron/loop
		void this.task();
	}

	async task(): Promise<void> {
		const result = await QueryBuilder
			.select("giveaways")
			.get();

		console.log(result);
	}
}
