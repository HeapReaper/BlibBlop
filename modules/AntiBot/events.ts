import {Client, Events as DiscordEvents, Events as discordEvents, Message, TextChannel,} from 'discord.js';
import {Logging} from '@utils/logging';
import {Pawtect, StatusCodes} from "@utils/pawtect";
import {getEnv} from "@utils/env.ts";

export default class Events {
    private client: Client;
    private logChannel: any;

    private messageRules = {
        min_message_length: 0,
        max_message_length: 1024,
        max_messages_per_user: 25,
        max_channels_in_window: 3,
        time_window_seconds: 10,
    }
    private memberJoinRules = {
        min_account_age: 1,
        username_regex: 'bot',
        must_have_avatar: false,
    }

    constructor(client: Client) {
        this.client = client;
        this.logChannel = this.client.channels.cache.get(<string>getEnv('MOD_LOG')) as TextChannel;
        this.messageEvents();
        this.memberEvents();
    }

    messageEvents(): void {
        this.client.on(discordEvents.MessageCreate, async (message: Message): Promise<void> => {
            if (message.author.id === this.client.user?.id || message.author.bot) return;

            try {
                const result = await Pawtect.onMessage(message, this.messageRules)

                if (result.status === StatusCodes.FORBIDDEN) {
                    Logging.info(`Pawtect event triggered for ${message.author.username}: ${result.reason}`);
                    await this.logChannel.send(`Pawtect event triggered for ${message.author.username}: ${result.reason}`);
                    await message.delete();
                }
            } catch (error) {
                Logging.error(`API error: ${error}`);
            }
        });
    }

    memberEvents(): void {
        this.client.on(DiscordEvents.GuildMemberAdd, async (member) => {
            try {
                const result = await Pawtect.onJoin(member, this.memberJoinRules);

                if (result.status === StatusCodes.FORBIDDEN) {
                    try {
                        await member.timeout(10 * 60 * 1000, `Pawtect timeout: ${result.reason}`);
                        await this.logChannel.send(`Pawtect timeout for user: ${member.user.username}: ${result.reason}`);
                        Logging.warn(`Pawtect Timed out ${member.user.tag} - Reason: ${result.reason}`);
                    } catch (error) {
                        Logging.error(`Failed to timeout ${member.user.tag}: ${error}`);
                    }
                } else {
                    Logging.info(`${member.user.tag} passed join checks`);
                }
            } catch (error) {
                Logging.error(`Error during Pawtect onJoin check: ${error}`);
            }
        });
    }
}
