import {
  Client, EmbedBuilder,
  Events as DiscordEvents,
  TextChannel,
} from "discord.js";
import { Logging } from "@utils/logging";
import { formatIsoDate } from "@utils/formatDate";
import { getEnv } from "@utils/env";
import { Color } from "@enums/ColorEnum";

export default class Events {
  private readonly client: Client;
  
  constructor(client: Client) {
    this.client = client;
    void this.timeOut();
  }

  async timeOut(): Promise<void> {
    this.client.on(DiscordEvents.GuildMemberUpdate, async (oldMember, newMember) => {
      if (oldMember.communicationDisabledUntil === newMember.communicationDisabledUntil) return;

      // If user got a timeout
      if (newMember.communicationDisabledUntil) {
        Logging.info(`The user ${newMember.user.displayName} has been timed-out until ${newMember.communicationDisabledUntil}`);
        await this.sendNotification(
          "Timeout toegevoegd",
          `<@${newMember.user.id}> heeft een timeout ontvangen: ${newMemb}`,
          Color.Green
        );
      // If user has his timeout removed
      } else {
        Logging.info(`Timeout removed from user ${newMember.user.displayName}`);
        await this.sendNotification(
          "Timeout verwijderd",
          `De timeout van <@${newMember.user.id}> is verwijderd.`,
          Color.Green
        );
      }
    });
  }

  async sendNotification(title: string, content: string, color: any) {
    const generalChannel = await this.client.channels.fetch(getEnv("GENERAL") as string) as TextChannel;
    //
    const embed: EmbedBuilder = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(content)

    await generalChannel.send({ embeds: [embed] });
  }
}
