import {
	Client,
	Events,
	MessageFlags,
	ChatInputCommandInteraction,
} from "discord.js";
import { Logging } from "@utils/logging";
import { getEnv } from "@utils/env";

export default class CommandsListener {
	private readonly client: Client;

	constructor(client: Client) {
		this.client = client;
		void this.commandsListener();
	}

	async commandsListener(): Promise<void> {
		this.client.on(Events.InteractionCreate, async (interaction): Promise<void> => {
			if (!interaction.isChatInputCommand()) return;

			const { commandName } = interaction;
			const subCommandName: string | null = interaction.options.getSubcommand(true);

			if (commandName !== "ai") return;

			switch (subCommandName) {
				case "vraag":
					await this.ask(interaction);
					break;
			}
		});
	}

	private async ask(interaction: ChatInputCommandInteraction): Promise<void> {
		if (!interaction.isChatInputCommand()) return;

		const prompt: string = interaction.options.getString("prompt", true);

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const aiResponse = await this.fetchAiResponse(prompt);

		await interaction.editReply(aiResponse);
	}

	async fetchAiResponse(prompt: string): Promise<string> {
			const response = await fetch(`${getEnv("AI_API_URL") as string}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: "gemma:2b",
				prompt: prompt,
				stream: false
			}),
		});

		const data = await response.json();

		return data.response;
	}		
}