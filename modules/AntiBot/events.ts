import {
    Client,
    Events as discordEvents,
    Message,
} from 'discord.js';


export default class Events {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
        this.messageEvents();
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

                if (res.status === 403) {
                    const reason = await res.text();
                    await message.delete();
                    // @ts-ignore
                    await message.channel.send(
                      `<@${message.author.id}> je bericht is verwijderd: **${reason}**`
                    );
                }

                if (res.status === 200) {
                    console.log(res.text);
                }
            } catch (err) {
                console.error("API error:", err);
            }
        });
    }

}
