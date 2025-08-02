import {
	Client,
	Interaction,
	Events,
	MessageFlags,
	TextChannel,
	ChannelType,
	PermissionFlagsBits,
} from 'discord.js';
import Database from '@utils/database';
import { Logging } from '@utils/logging';
import {getEnv} from '@utils/env';

export default class CommandsListener {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
		void this.commandsListener();
	}

	async commandsListener(): Promise<void> {
		this.client.on(Events.InteractionCreate, async (interaction: Interaction): Promise<void> => {
			if (!interaction.isCommand()) return;

			const { commandName } = interaction;
			// @ts-ignore
			const subCommandName: string | null = interaction.options.getSubcommand(false); // `false` = required = false

			if (commandName !== 'ticket') return;

			const ticketChannel = await this.client.channels.fetch(getEnv('TICKETS') as string) as TextChannel;
			const tickedConfidentialChannel = await this.client.channels.fetch(getEnv('TICKETS') as string) as TextChannel;

			switch (subCommandName) {
				case 'beheer':
					await this.createTicket(interaction, ticketChannel);
					break;
				case 'vertrouwelijk':
					await this.createTicket(interaction, tickedConfidentialChannel);
					break;
				case 'sluiten':
					await this.closeTicket(interaction);
					break;
			}
		});
	}

	async createTicket(interaction: Interaction, ticketChannel: TextChannel): Promise<void> {
		if (!interaction.isCommand()) return;

		try {
			// @ts-ignore
			const reason: string = interaction.options.getString('reden');

			const thread = await ticketChannel.threads.create({
				name: `${interaction.user.displayName} | ${reason}`,
				autoArchiveDuration: 60,
				reason: `${interaction.user.displayName} | ${reason}`,
				type: ChannelType.PrivateThread,
			})

			await thread.members.add(interaction.user.id);

			await thread.send(`<@${interaction.user.id}> | ${reason}`);

			await interaction.reply({
				content: `Ticket aangemaakt: ${thread.url}`,
				flags: MessageFlags.Ephemeral
			})
		} catch (error) {
			Logging.error(`Error in "ticketManagement": ${error}`);
		}
	}

	async closeTicket(interaction: Interaction): Promise<void> {
		if (!interaction.isCommand()) return;

		if (!interaction.channel?.isThread()) {
			await interaction.reply({
				content: "Dit command kan alleen in threads uitgevoerd worden!",
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		const thread = interaction.channel;
		const isThreadOwner = thread.ownerId === interaction.user.id;
		const hasManageThreads = interaction.memberPermissions?.has(PermissionFlagsBits.ManageThreads);

		if (!isThreadOwner && !hasManageThreads) {
			Logging.info('Someone tried a ticket close command without being ticket owner and without permissions');

			await interaction.reply({
				content: "Je moet de ticket eigenaar zijn of de machtiging **Threads beheren** hebben om dit ticket te sluiten.",
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		if (interaction.channel.parentId !== getEnv('TICKETS') && interaction.channel.parentId !== getEnv('TICKETS_CONFIDENTIAL')) {
			Logging.info('Someone tried a ticket close command in a non ticket thread');

			await interaction.reply({
				content: "Dit is geen ticket thread!",
				flags: MessageFlags.Ephemeral
			});
			return;
		}

		try {
			await interaction.reply(`Ticket gesloten door ${interaction.user.tag}.`);
			await thread.setArchived(true, `Ticket closed by ${interaction.user.tag}`);
		} catch (error) {
			Logging.error(`Error inside "closeTicket": ${error}`);
			await interaction.reply({
				content: "Er ging iets mis!",
			});
		}
	}
}
