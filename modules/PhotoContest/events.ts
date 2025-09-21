import {
    Client,
    TextChannel,
    Events as DiscordEvents,
    EmbedBuilder
} from "discord.js";
import { getEnv } from "@utils/env";
import { Logging } from "@utils/logging";
import { isBot } from "@utils/isBot";
import QueryBuilder from "@utils/database";
import { externalLogToServer } from "../ServerLogger/events";
import { Color } from "@enums/ColorEnum";
import { LogToServer } from "@utils/logToServer";

export default class Events {
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;
    void this.onPhotoContestMessage();
    void this.onPhotoContestReaction();
  }

  async onPhotoContestMessage() {
    this.client.on(DiscordEvents.MessageCreate, async (message) => {
      try {
        if (isBot(message.author, this.client)) return;

        if (message.channel.id !== getEnv("PHOTO_CONTEST")) return;

        const photoContestCh = await this.client.channels.fetch(getEnv("PHOTO_CONTEST") as string) as TextChannel;
        const messages = await photoContestCh.messages.fetch({ limit: 30 });

        const todayAuthorMessages = messages.filter(
          (msg) =>
            this.ifIsToday(msg.createdAt) &&
            msg.author.id === message.author.id &&
            msg.channelId === message.channelId
        );

        if (message.attachments.size === 0) {
          Logging.info("Denied a photo contest post: To little images");

          await LogToServer.warning("[bot] Bericht verwijderd", [
            { name: "Van", value: `<@${message.author.id}>`},
            { name: "Kanaal", value: `<#${message.channel.id}>`},
            { name: "Reden", value: `Minder dan 1 afbeelding in het bericht`},
          ])

          await message.delete();
          return this.sendRuleNotification(photoContestCh, "Minder dan 1 afbeelding in het bericht");
        }

        if ( message.attachments.size > 1) {
          Logging.info("Denied a photo contest post: To many images");

          await LogToServer.warning("[bot] Bericht verwijderd", [
            { name: "Van", value: `<@${message.author.id}>`},
            { name: "Kanaal", value: `<#${message.channel.id}>`},
            { name: "Reden", value: `Meer dan 1 afbeelding in het bericht`},
          ])

          await message.delete();
          return this.sendRuleNotification(photoContestCh, "Meer dan 1 afbeelding in het bericht");
        }

        if (message.content.length > 75) {
          Logging.info("Denied a photo contest post: To long of a message");

          await LogToServer.warning("[bot] Bericht verwijderd", [
            { name: "Van", value: `<@${message.author.id}>`},
            { name: "Kanaal", value: `<#${message.channel.id}>`},
            { name: "Reden", value: `Tekst boven de 75 tekens`},
          ])

          await message.delete();
          return this.sendRuleNotification(photoContestCh, "Tekst bij het bericht is boven de 75 tekens");
        }

        if (todayAuthorMessages.size > 1) {
          Logging.info("Denied a photo contest post: Author already posted a message today");

          await LogToServer.warning("[bot] Bericht verwijderd", [
            { name: "Van", value: `<@${message.author.id}>`},
            { name: "Kanaal", value: `<#${message.channel.id}>`},
            { name: "Reden", value: `Heeft al een bericht geplaatst vandaag`},
          ])

          await message.delete();
          return this.sendRuleNotification(photoContestCh, "Je hebt al een bericht geplaatst vandaag.");
        }

        Logging.info("A new photo contest image has been approved!");

        await message.react("🔥");
      } catch (error) {
        Logging.error(`Error inside onPhotoContestMessage: ${error}`);
      }
    });
  }

    async onPhotoContestReaction() {
        this.client.on(DiscordEvents.MessageReactionAdd, async (reaction, user) => {
            try {
                if (isBot(user, this.client)) return;

                if (reaction.emoji.name !== "🔥") return;

                const photoContestCh = await this.client.channels.fetch(getEnv("PHOTO_CONTEST") as string) as TextChannel;

                if (reaction.partial) {
                    reaction = await reaction.fetch();
                }

                if (reaction.message.partial) {
                    await reaction.message.fetch();
                }

                if (reaction.message.channel.id !== getEnv("PHOTO_CONTEST")) return;

                // @ts-ignore
                if (reaction.message.author.id == this.client.user.id) {
                    await reaction.users.remove(user.id);

                    await LogToServer.warning("[bot] Reactie verwijderd", [
                        { name: "Van", value: `<@${reaction.message.author?.id}>`},
                        { name: "Kanaal", value: `<#${reaction.message.channel.id}>`},
                        { name: "Reden", value: `Reactie op de bot`},
                    ])

                    await this.sendRuleNotification(photoContestCh, "Je kunt geen stem op een bot plaatsen.");

                    Logging.info(`Removed reaction of someone who tried voting on the bot!`)
                    return;
                }

                // @ts-ignore
                if (reaction.message.author.id == user.id) {
                    await reaction.users.remove(user.id);

                    await LogToServer.warning("[bot] Reactie verwijderd", [
                        { name: "Van", value: `<@${reaction.message.author?.id}>`},
                        { name: "Kanaal", value: `<#${reaction.message.channel.id}>`},
                        { name: "Reden", value: `Wou op zijn eigen bericht stemmen`},
                    ])
                    
                    await this.sendRuleNotification(photoContestCh, "Je kunt niet op jezelf stemmen!");

                    Logging.info(`Removed reaction of someone who tried voting on himself!`)
                    return;
                }

                const currVotes = await QueryBuilder
                  .raw(`
                        SELECT
                            count(*) as cnt
                        FROM votes
                        WHERE vote_name = "foto-wedstrijd"
                          AND user_id = "${user.id}"
                          AND YEAR(created_at) = YEAR(CURDATE())
                          AND MONTH(created_at) = MONTH(CURDATE());`)
                  .execute();

                if (currVotes[0].cnt > 2) {
                    await reaction.users.remove(user.id);
                    await externalLogToServer(
                      `Een stem verwijderd van <@${user.id ?? "0000"}> die deze maand al gestemd had!`,
                      this.client
                    );

                    await this.sendRuleNotification(photoContestCh, "Je kunt maximaal 2 keer per maand stemmen!");

                    Logging.info(`Removed a reaction from a user that already voted today!`)
                }

                if (reaction.message.channel.id !== getEnv("PHOTO_CONTEST")) return;

                await QueryBuilder
                  .insert("votes")
                  .values({
                      vote_name: "foto-wedstrijd",
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

                if (reaction.emoji.name !== "🔥") return;

                if (reaction.message.channel.id !== getEnv("PHOTO_CONTEST")) return;

                await QueryBuilder
                  .delete("votes")
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
        .setTitle("Bericht/reactie verwijderd")
        .setDescription("Regels: https://discord.com/channels/1350811442856726559/1350877019298070689/1397127398218137610")
        .addFields(
          { name: "Reden:", value: reason },
        );

      const notification = await channelToSend.send({ embeds: [embed] });

      setTimeout(() => {
          notification.delete();
      }, 4000)
    }
}
