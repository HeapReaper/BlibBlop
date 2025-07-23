import {
    Client,
    TextChannel,
    Events as DiscordEvents
} from 'discord.js';
import { getEnv } from '@utils/env';
import { Logging } from '@utils/logging';
import { isBot } from '@utils/isBot';
import QueryBuilder from '@utils/database';
import {externalLogToServer} from '../ServerLogger/events';

export default class Events {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
        void this.onPhotoContestMessage();
        void this.onPhotoContestReaction();
    }

    async onPhotoContestMessage() {
        this.client.on(DiscordEvents.MessageCreate, async (message) => {
            try {
                if (isBot(message.author, this.client)) return;

                if (message.channel.id !== getEnv('PHOTO_CONTEST')) return;

                const photoContestCh = await this.client.channels.fetch(getEnv('PHOTO_CONTEST') as string) as TextChannel;
                const messages = await photoContestCh.messages.fetch({ limit: 30 });
                const todayAuthorMessages = messages.filter((message) =>
                  this.ifIsToday(message.createdAt) && message.author.id === message.author.id
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

    async onPhotoContestReaction() {
        this.client.on(DiscordEvents.MessageReactionAdd, async (reaction, user) => {
            try {
                if (isBot(user, this.client)) return;

                if (reaction.emoji.name !== '🔥') return;

                if (reaction.partial) {
                    reaction = await reaction.fetch();
                }

                if (reaction.message.partial) {
                    await reaction.message.fetch();
                }

                if (reaction.message.channel.id !== getEnv('PHOTO_CONTEST')) return;

                // @ts-ignore
                if (reaction.message.author.id == this.client.user.id) {
                    await reaction.users.remove(user.id);
                    await externalLogToServer(
                      `Een stem verwijderd van <@${user.id ?? '0000'}> die in foto-wedstrijd een reactie op de bot plaatste`,
                      this.client
                    );
                    Logging.info(`Removed reaction of someone who tried voting on the bot!`)
                    return;
                }

                // @ts-ignore
                if (reaction.message.author.id == user.id) {
                    await reaction.users.remove(user.id);
                    await externalLogToServer(
                      `Een stem verwijderd van <@${user.id ?? '0000'}> die op zijn eigen bericht wou stemmen.`,
                      this.client
                    );
                    Logging.info(`Removed reaction of someone who tried voting on himself!`)
                    return;
                }

                const currVotes = await QueryBuilder
                  .raw(`
                        SELECT
                            count(*) as cnt
                        FROM votes
                        WHERE vote_name = 'foto-wedstrijd'
                          AND user_id = '${user.id}'
                          AND YEAR(created_at) = YEAR(CURDATE())
                          AND MONTH(created_at) = MONTH(CURDATE());`)
                  .execute();

                if (currVotes[0].cnt > 2) {
                    await reaction.users.remove(user.id);
                    await externalLogToServer(
                      `Een stem verwijderd van <@${user.id ?? '0000'}> die deze maand al gestemd had!`,
                      this.client
                    );
                    Logging.info(`Removed a reaction from a user that already voted today!`)
                }

                if (reaction.message.channel.id !== getEnv('PHOTO_CONTEST')) return;

                await QueryBuilder
                  .insert('votes')
                  .values({
                      vote_name: 'foto-wedstrijd',
                      user_id: user.id,
                      message_id: reaction.message.id,
                      channel_id: reaction.message.channel.id
                  })
                  .execute();
                Logging.info(`Added vote to the DB`);
            } catch (error) {
                Logging.error(`Error inside onPhotoContestReaction: ${error}`);
            }
        })

        this.client.on(DiscordEvents.MessageReactionRemove, async (reaction, user) => {
            try {
                if (isBot(user, this.client)) return;

                if (reaction.partial) await reaction.fetch();

                if (reaction.emoji.name !== '🔥') return;

                if (reaction.message.channel.id !== getEnv('PHOTO_CONTEST')) return;

                await QueryBuilder
                  .delete('votes')
                  .where({
                      user_id: user.id,
                      message_id: reaction.message.id,
                  })
                  .execute();

                Logging.info(`Removed vote from the DB`);
            } catch (error) {
                Logging.error(`Error inside onPhotoContestReaction: ${error}`);
            }
        })
    }

    ifIsToday(createdAt: Date) {
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
