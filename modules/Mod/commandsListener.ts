import {
	Client,
	Events as discordEvents,
	Interaction,
	EmbedBuilder,
	MessageFlags,
} from 'discord.js';
import {getEnv} from '@utils/env.ts';
import {chClient} from '@utils/clickhouse';
import {ColorEnum} from "@enums/ColorEnum";

export default class CommandsListener {
	private client: Client;
	private forumChannel: any;
	constructor(client: Client) {
		this.client = client;
		this.forumChannel = this.client.channels.cache.get(getEnv('TECH_SUPPORT') as string);
		void this.commandsListener();
	}

	async commandsListener(): Promise<void> {
		this.client.on(discordEvents.InteractionCreate, async (interaction: Interaction): Promise<void> => {
			if (!interaction.isMessageContextMenuCommand()) return;

			switch (interaction.commandName) {
				case 'Lid informatie ophalen':
					await this.MemberInfo(interaction);
					break;
			}
		});
	}

	async MemberInfo(interaction: any): Promise<void> {
		await new Promise(resolve => setTimeout(resolve, 2000));

		const guild = await this.client.guilds.fetch('1350811442856726559')
		const member = await guild.members.fetch(interaction.targetMessage.author.id);
		const roles = member.roles.cache
			.filter(role => role.name !== '@everyone')
			.map(role => `${role.name}`)
			.join(', ') ?? 'Geen rollen';
		const permissions = member.permissions.toArray().join(', ')
		const msgAndReactionCount = await this.getMessageCount(member.id)


		const embed = new EmbedBuilder()
			.setColor(ColorEnum.Green)
			.setTitle(`Lid Informatie`)
			.setDescription(`Over: ${member.displayName}`)
			.addFields(
				{ name: `Gebruikersnaam:`, value: `${member.user.username ?? 'Oeps'}`, inline: false },
				{ name: `Gejoined op:`, value: `${await this.formatDate(member.joinedAt) ?? 'Oeps'}`, inline: false },
				{ name: `Rollen:`, value: `${roles ?? 'Oeps'}`, inline: false },
				{ name: `Permissies:`, value: `${permissions ?? 'Oeps'}`, inline: false },
				{ name: `Aantal berichten en reacties:`, value: `${msgAndReactionCount ?? 'Oeps'}`, inline: false },
			)

		await interaction.reply({
			embeds: [embed],
			flags: MessageFlags.Ephemeral,
		});
	}

	async formatDate(isoDate: any) {
		const date = new Date(isoDate);
		const pad = (n: number) => n.toString().padStart(2, '0');

		return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear().toString().slice(2)} ` +
			`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
	}

	async getMessageCount(authorId: string): Promise<number> {
		// @ts-ignore
		const result = await chClient.query({
			query: `SELECT count(*) AS cnt FROM discord_messages WHERE author_id='${authorId}'`,
			format: 'JSONEachRow'
		});

		const rows = await result.json();
		// @ts-ignore
		return rows[0]['cnt'];
	}
}