import {
    Client, Events as DiscordEvents,
    Events as discordEvents,
    Message, TextChannel,
} from 'discord.js';
import { Logging } from '@utils/logging';
import { Faker } from '@heapreaper/discordfaker';

export default class Events {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
        this.messageEvents();
        this.memberEvents();
        Faker.memberAdd(client)
    }

    messageEvents(): void {
        this.client.on(discordEvents.MessageCreate, async (message: Message): Promise<void> => {
            if (message.author.id === this.client.user?.id || message.author.bot) return;

            const payload = {
                username: message.author.username,
                author_id: message.author.id,
                channel_id: message.channel.id,
                message_content: message.content,
                message_length: message.content.length,
                message_count: 0,
                rules: {
                    min_message_length: 1,
                    max_message_length: 1024,
                    max_messages_per_user: 25,
                    max_channels_in_window: 3,
                    time_window_seconds: 10,
//                    message_content_regex: "",
                },
            };

            try {
                const res = await fetch("https://pawtect.heapreaper.nl/event/message", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (res.status !== 200) {
                    const reason = await res.text();
                    Logging.warn(`AntiBot event triggered for ${message.author.username}#${reason}`);

                    await message.delete();
                }
            } catch (err) {
                console.error("API error:", err);
            }
        });
    }

    memberEvents(): void {
        this.client.on(DiscordEvents.GuildMemberAdd, async (member) => {
            const createdAt = member.user.createdAt;
            const now = new Date();
            const accountAgeDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const hasAvatar = !!member.user.avatar;

            const response = await fetch("https://pawtect.heapreaper.nl/event/join", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: member.user.username,
                    account_age_days: accountAgeDays,
                    has_avatar: hasAvatar,
                    rules: {
                        min_account_age: 1,
                        username_regex: "bot",
                        must_have_avatar: false,
                    },
                }),
            });

            if (response.status !== 200) {
                const reason: string = await response.text();

                try {
                    await member.kick(`Pawtect kick: ${reason}`);
                    Logging.warn(`Kicked ${member.user.tag} - Reason: ${reason}`);
                } catch (err) {
                    Logging.error(`Failed to kick ${member.user.tag}:`, err);
                }
            } else {
                Logging.info(`${member.user.tag} passed join checks`);
            }
        });
    }
}
