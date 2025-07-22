import {
    Client,
    TextChannel,
    Events as DiscordEvents
} from 'discord.js';
import {getEnv} from '@utils/env';
import {Logging} from '@utils/logging';

export default class Events {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
        void this.onPhotoContestMessage();
    }

    async onPhotoContestMessage() {
        this.client.on(DiscordEvents.MessageCreate, async (message) => {
            try {
                if (message.author.id === this.client.user?.id || message.author.bot) return;

                if (message.channel.id !== getEnv('PHOTO_CONTEST')) return;

                const photoContestCh = await this.client.channels.fetch(getEnv('PHOTO_CONTEST') as string) as TextChannel;
                const messages = await photoContestCh.messages.fetch({ limit: 30 });
                const todayAuthorMessages = messages.filter((message) =>
                  this.isToday(message.createdAt) && message.author.id === message.author.id
                );

                if (message.attachments.size === 0 || message.attachments.size > 1) {
                    await message.delete();
                    return this.sendRuleNotification(photoContestCh);
                }

                if (message.content.length > 30) {
                    await message.delete();
                    return this.sendRuleNotification(photoContestCh);
                }
                if (todayAuthorMessages.size > 1) {
                    await message.delete();
                    return this.sendRuleNotification(photoContestCh);
                }

                Logging.info('A new photo contest image has been approved!');

                await message.react('🔥');
            } catch (error) {
                Logging.error(`Error inside onPhotoContestMessage: ${error}`);
            }
        });
    }

    isToday(createdAt: Date) {
        const now = new Date();
        return createdAt.getDate() === now.getDate() &&
          createdAt.getMonth() === now.getMonth() &&
          createdAt.getFullYear() === now.getFullYear();
    }

    async sendRuleNotification(photoContestCh: any) {
        const notification = await photoContestCh.send({
            content: 'Regels: Zie https://discord.com/channels/1350811442856726559/1350877019298070689/1397127398218137610'
        })

        setTimeout(() => {
            notification.delete();
        }, 4000)
    }
}
