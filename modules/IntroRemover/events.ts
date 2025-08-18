import {
    Client,
    TextChannel,
    Events as DiscordEvents,
} from 'discord.js';
import { getEnv } from '@utils/env';
import { isBot } from '@utils/isBot';
import { externalLogToServer } from '../ServerLogger/events';
import {Logging} from "@utils/logging.ts";

export default class Events {
    private readonly client: Client;
    private introChannel: TextChannel;

    constructor(client: Client) {
        this.client = client;
        this.introChannel = this.client.channels.cache.get(getEnv('INTRO') as string) as TextChannel;
        void this.bootEvent();
    }

    async bootEvent(): Promise<void> {
        this.client.on(DiscordEvents.MessageCreate, async (message) => {
            if (isBot(message.author, this.client)) return;

            if (message.channel.id !== getEnv('INTRO') as string) return;

            Logging.info('Checking if user sended more then 1 message in intro channel');
            const oldMessages = await this.introChannel.messages.fetch({});

            const userMessages = oldMessages.filter(
              (msg) => msg.author.id === message.author.id && msg.id !== message.id
            );

            if (userMessages.size > 1) {
                Logging.info('Deleted intro channel message');

                await message.delete();
                await externalLogToServer(`Ik heb een intro bericht verwijderd van <@${message.author.id}>.`, this.client);
            }
        })
    }

}
