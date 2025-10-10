import {Client, EmbedBuilder, TextChannel} from "discord.js";
import { getEnv } from "@utils/env";
import { Logging } from "@utils/logging";
import { Color } from "@enums/ColorEnum";

let instance: BumpReminderTasks | null = null;

export default class BumpReminderTasks {
	private readonly client: Client;
	private bumpChannel: TextChannel;
	
	constructor(client: Client) {
		this.client = client;
		this.bumpChannel = this.client.channels.cache.get(
			// @ts-ignore
			getEnv("BUMP") !== undefined ? getEnv("BUMP") : Logging.error("BUMP channel not found in env!")
		) as TextChannel;

		if (instance) return instance;
		instance = this;

		//this.bumpReminderTask();
	}
	
	bumpReminderTask(): void {
		try {
			setInterval(async () => {
				Logging.trace("Checking if the server can be bumped again!");

				if (!this.bumpChannel) {
					Logging.warn("bumpChannel is undefined!");
					return;
				}

				const messages = this.bumpChannel.messages.fetch({limit: 20});

				messages.then(async messages => {
					if (messages.size === 0) return;

					const lastMessage = messages.first();
					if (!lastMessage) return;

					if (lastMessage?.author.id === this.client.user?.id) return;

					// @ts-ignore
					if (lastMessage.createdTimestamp < Date.now() - (2 * 60 * 60 * 1000)) {
						const embed = new EmbedBuilder()
							.setColor(Color.Blue)
							.setTitle("RC Garage Herinnering")
							.setDescription("De server kan weer gebumped worden! Dit kan met het command `/bump`.\nJe helpt de server daarmee groeien!")

						await this.bumpChannel.send({ embeds: [embed]});
					}
				});
			}, 20000);
		} catch(e) {
			Logging.warn(`Error in bump reminder tasks: ${e}`);
		}
	}
}