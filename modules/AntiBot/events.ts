import {
  Client,
  TextChannel,
  Events as DiscordEvents,
  PermissionFlagsBits, EmbedBuilder,
} from "discord.js";
import { isBot } from "@utils/isBot";
import { getEnv } from "@utils/env";
import {Color} from "@enums/ColorEnum.ts";

export default class Events {
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;
    void this.InviteBlocker();
  }

  async InviteBlocker() {
    this.client.on(DiscordEvents.MessageCreate, async (message) => {
      if (isBot(message.author, this.client)) return;

      const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;

      // If message content doesnt have invite link, do nothing
      if (!inviteRegex.test(message.content)) return;

      // If member can manage permissions, do nothing
      if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return

      // Delete message
      await message.delete();

      // Send notification of blocked invite link
      await this.sendNotification(
        "Bericht automatisch verwijderd",
        `Ik heb een Discord invite link automatisch verwijderd van ${message.author.displayName}`
      );

    });
  }

  async sendNotification(title: string, content: string) {
    const channel = await this.client.channels.fetch(getEnv("GENERAL") as string) as TextChannel;

    const embed = new EmbedBuilder()
      .setColor(Color.Blue)
      .setTitle(title)
      .setDescription(content);

    await channel.send({ embeds: [embed] });
  }
}
