import {
	AttachmentBuilder,
	AuditLogEvent,
	Client,
	EmbedBuilder,
	Events as discordEvents,
	GuildBan,
	GuildMember,
	Message,
	OmitPartialGroupDMChannel,
	PartialGuildMember,
	PartialMessage,
	TextChannel,
	VoiceState,
	User,
} from 'discord.js';
import { Logging } from '@utils/logging.ts';
import { getEnv } from '@utils/env.ts';
import S3OperationBuilder from '@utils/s3';
import QueryBuilder from '@utils/database.ts';
import path from 'path';
import { Github } from '@utils/github';
import { Color } from '@enums/ColorEnum'
import db from '@utils/knex.ts';
import os from 'os';
import { insertMessage, isClickhouseOnline } from '@utils/clickhouse.ts';

export default class Events {
	private client: Client;
	private logChannel: any;
	private botIcon: AttachmentBuilder;
	private chatIcon: AttachmentBuilder;
	private voiceChatIcon: AttachmentBuilder;
	private reactionIcon: AttachmentBuilder;
	private userIcon: AttachmentBuilder;
	private moderationIcon: AttachmentBuilder;

	constructor(client: Client) {
		this.client = client;
		this.logChannel = this.client.channels.cache.get(<string>getEnv('LOG')) as TextChannel;
		this.botIcon = new AttachmentBuilder(`${<string>getEnv('MODULES_BASE_PATH')}src/media/icons/bot.png`);
		this.chatIcon = new AttachmentBuilder(`${<string>getEnv('MODULES_BASE_PATH')}src/media/icons/chat.png`);
		this.voiceChatIcon = new AttachmentBuilder(`${<string>getEnv('MODULES_BASE_PATH')}src/media/icons/microphone.png`);
		this.reactionIcon = new AttachmentBuilder(`${<string>getEnv('MODULES_BASE_PATH')}src/media/icons/happy-face.png`);
		this.userIcon = new AttachmentBuilder(`${<string>getEnv('MODULES_BASE_PATH')}src/media/icons/user.png`);
		this.moderationIcon = new AttachmentBuilder(`${<string>getEnv('MODULES_BASE_PATH')}src/media/icons/moderation.png`);
		void this.bootEvent();
		this.messageEvents();
		this.reactionEvents();
		this.voiceChannelEvents();
		void this.memberEvents();
	}

	async bootEvent(): Promise<void> {
		try {
			const currentRelease: string | null = await Github.getCurrentRelease();
			const mariaDB = await QueryBuilder.isOnline() ? '✅ Online' : '❌ Offline';
			const s3 = (await S3OperationBuilder.setBucket(getEnv('S3_BUCKET_NAME') as string).status()).up ? '✅ Online' : '❌ Offline';
			const clickHouse = await isClickhouseOnline() ? '✅ Online' : '❌ Offline';

			await new Promise<void>(resolve => {
				const interval = setInterval((): void => {
					if (this.client.ws.ping >= 0) {
						clearInterval(interval);
						resolve();
					}
				}, 500);
			});

			const bootEmbed: EmbedBuilder = new EmbedBuilder()
				.setColor(Color.AeroBytesBlue)
				.setTitle('Ik ben opnieuw opgestart!')
				.addFields(
					{ name: 'Gebruiker:', value: `<@${this.client.user?.id ?? 'Fout'}>`, inline: true  },
					{ name: 'Versie:', value: `${currentRelease ? currentRelease : 'Rate limited'}`, inline: true  },
					{ name: 'Host', value: `${os.hostname() ?? 'Fout'}`, inline: true },
					{ name: 'Ping:', value: `${this.client.ws.ping ?? 'Fout'}ms`, inline: true  },
					{ name: 'MariaDB', value: mariaDB, inline: true  },
					{ name: 'S3', value: s3, inline: true  },
					{ name: 'ClickHouse', value: clickHouse, inline: true },
				)
				.setThumbnail('attachment://bot.png');

			await this.logChannel.send({ embeds: [bootEmbed], files: [this.botIcon] });
		} catch (error) {
			Logging.error(`Error in bootEvent serverLogger: ${error}`);
		}
	}

	/**
	 * Handles all message logging.
	 *
	 * - Message edit.
	 * - Message delete.
	 * - Message bulk delete.
	 * @return void
	 */
	messageEvents(): void {
		this.client.on(discordEvents.MessageCreate, async (message: Message): Promise<void> => {
			if (message.author.id === this.client.user?.id || message.author.bot) return;

			Logging.info('Caching message');

			try {
				await insertMessage(message);
			} catch (error) {
				Logging.error(`Error while trying to cache message inside server logger: ${error}`);
			}

			if (!message.attachments.size) return;

			try {
				for (const attachment of message.attachments.values()) {
					const fileUrl = attachment.url;
					const fileName = `${message.id}-${path.basename(fileUrl)}`;

					const response = await fetch(fileUrl);
					const arrayBuffer = await response.arrayBuffer();
					const buffer = Buffer.from(arrayBuffer);

					if (!attachment.contentType?.startsWith('image/') && !attachment.contentType?.startsWith('video/')) return;

					Logging.info('Caching a image/video to S3');

					await S3OperationBuilder
						.setBucket(<string>getEnv('S3_BUCKET_NAME'))
						.uploadFileFromBuffer(`serverLogger/${fileName}`, buffer, {
							'Content-Type': attachment.contentType,
						});
				}
			} catch (error) {
				Logging.error(`Error while caching image/video inside server logger: ${error}`);
			}
		});

		this.client.on(discordEvents.MessageUpdate, async (
			oldMessage: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>,
			newMessage: OmitPartialGroupDMChannel<Message<boolean>>): Promise<void> => {

			if (newMessage.author.id === this.client.user?.id || newMessage.author.bot) return;

			if (newMessage.content === oldMessage.content) return

			Logging.debug('An message has been edited!');

			// TODO: Temp fix
			const fields = [
				{ name: 'Gebruiker', value: `<@${oldMessage.author?.id ?? 'Fout'}>` }
			];

			if ((oldMessage.content ?? '').length <= 1024) {
				fields.push({ name: 'Oud:', value: oldMessage.content ?? 'Er ging wat fout' });
			}

			if ((newMessage.content ?? '').length <= 1024) {
				fields.push({ name: 'Nieuw:', value: newMessage.content ?? 'Er ging wat fout' });
			}

			const messageUpdateEmbed: any = new EmbedBuilder()
				.setColor(Color.Orange)
				.setTitle('Bericht bewerkt')
				.setThumbnail('attachment://chat.png')
				.addFields(...fields);

			this.logChannel.send({ embeds: [messageUpdateEmbed], files: [this.chatIcon] });
		});

		// @ts-ignore
		this.client.on(discordEvents.MessageDelete, async (message: Message): Promise<void> => {
			Logging.debug('An message has been deleted!');

			const allS3Files = await S3OperationBuilder
				.setBucket(<string>getEnv('S3_BUCKET_NAME'))
				.listObjects();

			const messageFromDbCache = await db('messages')
				.where({id: message.id})
				.first();

			Logging.debug(`${messageFromDbCache}`)

			if (!allS3Files.success) {
				Logging.warn('Failed to list S3 objects. Skipping attachment restoration.');
				return;
			}

			const filesToAttach = allS3Files.data.filter((file: any) =>
				file?.name?.startsWith(`serverLogger/${message.id}-`)
			);

			const attachments: AttachmentBuilder[] = [];

			const messageDelete: any = new EmbedBuilder()
				.setColor(Color.Red)
				.setTitle('Bericht verwijderd')
				.setThumbnail('attachment://chat.png')
				.addFields(
					{
						name: 'Gebruiker',
						value: `<@${
							message.partial
								? (messageFromDbCache && messageFromDbCache.author_id ? messageFromDbCache.author_id : '10101')
								: message.author?.id ?? '10101'
						}>`
					},
					{ name: 'Bericht:', value: `${message.content ?? 'Fout'}` },
				);

			for (const file of filesToAttach) {
				const url = await S3OperationBuilder
					.setBucket(<string>getEnv('S3_BUCKET_NAME'))
					.getObjectUrl(file.name);

				const response = await fetch(url);
				const arrayBuffer = await response.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				const filename = file.name.split('/').pop() ?? 'attachment';
				attachments.push(new AttachmentBuilder(buffer, { name: filename }));
			}

			await this.logChannel.send({ embeds: [messageDelete], files: [this.chatIcon] });

			if (attachments.length === 0) return;

			await this.logChannel.send({ files: attachments });
		});

		// @ts-ignore
		this.client.on(discordEvents.MessageBulkDelete, async (messages: Collection<string, Message>): Promise<void> => {
			Logging.debug('Bulk messages have been deleted!');

			const deletedMessages: any[] = [];

			for (const message of messages.values()) {
				deletedMessages.push({
					name: `Van: ${message.member?.displayName || message.author?.tag || 'Niet bekend'}`,
					value: message.content || 'Geen inhoud',
				});
			}

			const bulkMessagesDeleted: EmbedBuilder = new EmbedBuilder()
				.setColor(Color.Red)
				.setTitle('Bulk berichten verwijderd')
				.setThumbnail('attachment://chat.png')
				.addFields(...deletedMessages);

			await this.logChannel.send({ embeds: [bulkMessagesDeleted], files: [this.chatIcon] });
		});
	}

	/**
	 * Handles all reaction logging
	 *
	 * @return void
	 */
	reactionEvents(): void {
		this.client.on(discordEvents.MessageReactionAdd, async (reaction, user) => {
			if (user.id === this.client.user?.id || user.bot) return;

			if (reaction.partial) {
				try {
					await reaction.fetch();
				} catch (err) {
					Logging.warn(`Failed to fetch reaction: ${err}`);
				}
			}

			Logging.info('Reaction added to message!');

			const messageReactionAddEmbed: EmbedBuilder = new EmbedBuilder()
				.setColor(Color.Green)
				.setTitle('Reactie toegevoegd')
				.setDescription(`Door: <@${user.id}>`)
				.setThumbnail('attachment://happy-face.png')
				.addFields(
					{ name: 'Gebruiker:', value: `<@${user.id} ?? 'Fout'>` },
					{ name: 'Emoji:', value: `${reaction.emoji ?? 'Fout'}` },
					{ name: 'Bericht:', value: `${reaction.message.url ?? 'Fout'}` }
				);

			await this.logChannel.send({ embeds: [messageReactionAddEmbed], files: [this.reactionIcon] });
		});

		this.client.on(discordEvents.MessageReactionRemove, async (reaction, user) => {
			Logging.info('Reaction removed to message!');

			const messageReactionAddEmbed: EmbedBuilder = new EmbedBuilder()
				.setColor(Color.Orange)
				.setTitle('Reactie verwijderd')
				.setThumbnail('attachment://happy-face.png')
				.addFields(
					{ name: 'Gebruiker:', value: `<@${user.id ?? 'Fout'}>` },
					{ name: 'Emoji:', value: `${reaction.emoji ?? 'Fout'}` },
					{ name: 'Bericht:', value: `${reaction.message.url ?? 'Fout'}` }
				);

			await this.logChannel.send({ embeds: [messageReactionAddEmbed], files: [this.reactionIcon] });
		});
	}

	/**
	 * Handles voice channel logging
	 *
	 * @return void
	 */
	voiceChannelEvents(): void {
		this.client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
            Logging.debug(`Event VoiceStateUpdate triggered in Serverlogger/events.ts`)

			try {
				if (!oldState.channel && newState.channel) {
					const voiceChannelEmbed: EmbedBuilder = new EmbedBuilder()
						.setColor(Color.Green)
						.setTitle('Voice kanaal gejoined')
						.setThumbnail('attachment://microphone.png')
						.addFields(
							// @ts-ignore
							{ name: 'Gebruiker:', value: `<@${newState.member.user.id ?? 'Fout'}>` },
							{ name: 'Kanaal:', value: `${newState.channel.url ?? 'Fout'}` },
						);

					await this.logChannel.send({ embeds: [voiceChannelEmbed], files: [this.voiceChatIcon] });
				}
			} catch (error) {
				Logging.error(`Error inside logging new member in vc: ${error}`)
			}


			try {
				// If user leaves voice channel
				if (oldState.channel && !newState.channel) {
					Logging.info('A user leaved VC');

					const voiceChannelEmbed: EmbedBuilder = new EmbedBuilder()
						.setColor(Color.Orange)
						.setTitle('Voice kanaal verlaten')
						.setThumbnail('attachment://microphone.png')
						.addFields(
							// @ts-ignore
							{ name: 'Gebruiker:', value: `<@${oldState.member.user.id ?? 'Fout'}>` },
							{ name: 'Kanaal:', value: `${oldState.channel.url ?? 'Fout'}` },
						);

					await this.logChannel.send({ embeds: [voiceChannelEmbed], files: [this.voiceChatIcon] });
				}
			} catch (error) {
				Logging.error(`Error inside logging member leaves vc: ${error}`)
			}

			try {
				// If a user changes voice channel
				if (oldState.channel !== newState.channel) {
					if (!oldState.channel || !newState.channel) return;

					Logging.info('A user changed VC');

					const voiceChannelEmbed: EmbedBuilder = new EmbedBuilder()
						.setColor(Color.Green)
						.setTitle('Voice kanaal veranderd')
						.setThumbnail('attachment://microphone.png')
						.addFields(
							{ name: 'Gebruiker:', value: `<@${oldState.member?.user.id ?? 'Fout' }>` },
							{ name: 'Oud:', value: `${oldState.channel.url ?? 'Fout'}` },
							{ name: 'Nieuw:', value: `${newState.channel.url ?? 'Fout'}` },
						);

					await this.logChannel.send({ embeds: [voiceChannelEmbed], files: [this.voiceChatIcon] });
				}
			} catch (error) {
				Logging.error(`Error inside logging member changes vc: ${error}`)
			}
		});
	}

	/**
	 * Handles membership-related events in a Discord server, such as when members join, leave, are banned, unbanned, or updated.
	 * Logs the events and sends an embed message to a designated channel with information about the membership event.
	 *
	 * @return {Promise<void>} Resolves when the events are registered and handled properly.
	 */
	async memberEvents(): Promise<void> {
		// On member join is handles by invite tracker
		this.client.on(discordEvents.GuildMemberRemove, async (member: GuildMember|PartialGuildMember): Promise<void> => {
			Logging.info('A user left this Discord!');

			const memberEventEmbed = new EmbedBuilder()
				.setColor(Color.Red)
				.setTitle('Lid verlaten')
				.setThumbnail('attachment://user.png')
				.addFields(
					{ name: 'Gebruiker:', value: `<@${member.id ?? 'Fout'}>` },
					{ name: 'Lid sinds:', value: `${(member.joinedAt?.toLocaleString('nl-NL') ?? 'Fout') }` },
				);

			await this.logChannel.send({ embeds: [memberEventEmbed], files: [this.userIcon] });
		});

		this.client.on(discordEvents.GuildBanAdd, async (ban: GuildBan): Promise<void> => {
			Logging.info('A user was banned on this Discord!');

			const fetchBan: GuildBan = await ban.guild.bans.fetch(ban.user.id);
			const auditLogs = await ban.guild.fetchAuditLogs({
				type: AuditLogEvent.MemberBanAdd,
				limit: 1
			});

			const banLog = auditLogs.entries.find(
				entry => entry.target?.id === ban.user.id)
			;
			// @ts-ignore
			const executor: User|null|undefined = banLog?.executor;

			const memberEventEmbed = new EmbedBuilder()
				.setColor(Color.Red)
				.setTitle('Lid gebanned')
				.setThumbnail('attachment://moderation.png')
				.addFields(
					{ name: 'Gebruiker:', value: `<@${ban.user.id ?? 'Fout'}>` },
					{ name: 'Reden:', value: `${fetchBan.reason ?? 'Geen reden opgegeven'}` },
					{ name: 'Door:', value: executor ? `${executor.username} (<@${executor.id}>)` : 'Onbekend' },
				);

			await this.logChannel.send({ embeds: [memberEventEmbed], files: [this.moderationIcon] });
		});

		this.client.on(discordEvents.GuildBanRemove, async (unBan: GuildBan): Promise<void> => {
			Logging.info('A user was unbanned on this Discord!');

			const auditLogs = await unBan.guild.fetchAuditLogs({
				type: AuditLogEvent.MemberBanAdd,
				limit: 1
			});

			const unBanLog = auditLogs.entries.find(
				entry => entry.target?.id === unBan.user.id)
			;
			// @ts-ignore
			const executor: User|null|undefined = unBanLog?.executor;

			const memberEventEmbed = new EmbedBuilder()
				.setColor(Color.Orange)
				.setTitle('Lid unbanned')
				.setThumbnail('attachment://moderation.png')
				.addFields(
					{ name: 'Gebruiker:', value: `<@${unBan.user.id ?? 'Fout'}>` },
					{ name: 'Door:', value: executor ? `${executor.username} (<@${executor.id}>)` : 'Onbekend' },
				)

			await this.logChannel.send({ embeds: [memberEventEmbed], files: [this.moderationIcon] });
		});

		this.client.on(discordEvents.GuildMemberUpdate, async (oldMember: GuildMember|PartialGuildMember, newMember: GuildMember): Promise<void> => {
			if (oldMember.displayName === newMember.displayName) return;

			Logging.info('A user was updated in this Discord!');

			const memberEventEmbed = new EmbedBuilder()
				.setColor(Color.Green)
				.setTitle('Lid gebruikersnaam update')
				.setThumbnail('attachment://user.png')
				.addFields(
					{ name: 'Gebruiker:', value: `<@${newMember.user.id ?? 'Fout'}>` },
					{ name: 'Oud:', value: `${oldMember.displayName ?? 'Niet gevonden'}` },
					{ name: 'Nieuw:', value: `${newMember.displayName ?? 'Niet gevonden'}` },
				);

			await this.logChannel.send({ embeds: [memberEventEmbed], files: [this.userIcon]});
		});
	}
}
