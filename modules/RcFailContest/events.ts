import {
  Client,
  TextChannel,
  Events as DiscordEvents,
  EmbedBuilder
} from 'discord.js';
import { getEnv } from '@utils/env';
import { Logging } from '@utils/logging';
import { isBot } from '@utils/isBot';
import QueryBuilder from '@utils/database';
import { externalLogToServer } from '../ServerLogger/events';
import { Color } from "@enums/ColorEnum.ts";

export default class Events {
  private readonly client: Client;
  private readonly RcFailsChannelId: string;

  constructor(client: Client) {
    this.client = client;
    this.RcFailsChannelId = getEnv('RC_FAILS') ?? '';
    void this.onRcFailMessage();
    void this.onRcFailReaction();
  }

  async onRcFailMessage() {
    this.client.on(DiscordEvents.MessageCreate, async (message) => {
      try {
        if (isBot(message.author, this.client)) return;

        if (message.channel.id !== this.RcFailsChannelId) return;

        const rcFailsCh = await this.client.channels.fetch(this.RcFailsChannelId as string) as TextChannel;
        const messages = await rcFailsCh.messages.fetch({ limit: 60 });

        const todayAuthorMessages = messages.filter(
          (msg) =>
            this.ifIsToday(msg.createdAt) &&
            msg.author.id === message.author.id &&
            msg.author.id === message.author.id &&
            msg.channelId === message.channelId
        );

        if (message.attachments.size === 0) return;

        if (message.attachments.size > 1) {
          Logging.info('Denied a RC fails post: To many images');
          await externalLogToServer(
        `Ik verwijderde een RC fails post van <@${message.author.id}: Meer dan 1 afbeelding in het bericht`,
            this.client
          );
          await message.delete();
          return this.sendRuleNotification(rcFailsCh, 'Meer dan 1 afbeelding in het bericht');
        }

        if (message.content.length > 75) {
          Logging.info('Denied a photo contest post: To long of a message');
          await externalLogToServer(
        `Ik verwijderde een RC Fails post van <@${message.author.id}>: Tekst boven de 30 tekens`,
            this.client
          );
          await message.delete();
          return this.sendRuleNotification(rcFailsCh, 'Tekst bij bericht boven de 30 tekens');
        }

        if (todayAuthorMessages.size > 1) {
          Logging.info('Denied a photo contest post: Author already posted a message today');
          await externalLogToServer(
            `Ik verwijderde een foto wedstrijd post van <@${message.author.id}>: Heeft al een bericht geplaatst vandaag`,
            this.client
          );
          await message.delete();
          return this.sendRuleNotification(rcFailsCh, 'Je hebt al een fail geplaatst vandaag');
        }

        Logging.info('A new RC Fail contest image has been approved!');

        await message.react('🤦');
      } catch (error) {
        Logging.error(`Error inside "onRcFailMessage": ${error}`);
      }
    });
  }

  async onRcFailReaction() {
      this.client.on(DiscordEvents.MessageReactionAdd, async (reaction, user) => {
        try {
          if (isBot(user, this.client)) return;

          if (reaction.emoji.name !== '🤦') return;

          const rcFailsCh = await this.client.channels.fetch(this.RcFailsChannelId as string) as TextChannel;

          if (reaction.partial) {
              reaction = await reaction.fetch();
          }

          if (reaction.message.partial) {
              await reaction.message.fetch();
          }

          if (reaction.message.channel.id !== this.RcFailsChannelId) return;

          // @ts-ignore
          if (reaction.message.author.id == this.client.user.id) {
            await reaction.users.remove(user.id);
            await externalLogToServer(
              `Een stem verwijderd van <@${user.id ?? '0000'}> die in Rc-fails een reactie op de bot plaatste`,
              this.client
            );

            await this.sendRuleNotification(rcFailsCh, 'Je kunt geen reactie op een bot plaatsen!');

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

            await this.sendRuleNotification(rcFailsCh, 'Je kunt niet op jezelf stemmen.');

            await this.onRcFailReaction()
            Logging.info(`Removed reaction of someone who tried voting on himself!`)
            return;
          }

          const currVotes = await QueryBuilder
            .raw(`
              SELECT
                  count(*) as cnt
              FROM votes
              WHERE vote_name = 'rc-fails'
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

            await this.sendRuleNotification(rcFailsCh, 'Je hebt teveel gestemd! Max 2 per maand.');

            Logging.info(`Removed a reaction from a user that already voted today!`)
          }

          if (reaction.message.channel.id !== this.RcFailsChannelId) return;

          await QueryBuilder
            .insert('votes')
            .values({
              vote_name: 'rc-fails',
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

            if (reaction.message.channel.id !== this.RcFailsChannelId) return;

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

  async sendRuleNotification(channelToSend: TextChannel, reason: string) {
    const embed = new EmbedBuilder()
      .setColor(Color.Red)
      .setTitle('Bericht/reactie verwijderd')
      .setDescription('Regels: https://discord.com/channels/1350811442856726559/1350877019298070689/1397127398218137610')
      .addFields(
        { name: 'Reden:', value: reason },
      );

    const notification = await channelToSend.send({ embeds: [embed] });

    setTimeout(() => {
      notification.delete();
    }, 4000)
  }
}
