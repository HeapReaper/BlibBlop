import {
  Client,
  TextChannel,
  Events as DiscordEvents,
  PermissionFlagsBits, EmbedBuilder,
} from "discord.js";
import { isBot } from "@utils/isBot";
import { getEnv } from "@utils/env";
import { Color } from "@enums/ColorEnum";
import { LogToServer } from "@utils/logToServer";

type UserMessageRecord = {
  timestamps: number[];
  channels: Set<string>;
};

export default class Events {
  private readonly client: Client;
  private userMessageMap: Map<string, UserMessageRecord> = new Map();

  constructor(client: Client) {
    this.client = client;

    void this.inviteBlocker();
    void this.massMessageBlocker();
    void this.spamWordBlocker();
  }

  async inviteBlocker() {
    this.client.on(DiscordEvents.MessageCreate, async (message) => {
      if (isBot(message.author, this.client)) return;

      if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;

      const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)/i;

      if (!inviteRegex.test(message.content)) return;

      await message.delete();

      await this.sendNotification(
        "Bericht automatisch verwijderd",
        `Ik heb een Discord invite link automatisch verwijderd van ${message.author.username}`
      );

      await LogToServer.warning(
        "Bericht automatisch verwijderd",
        [
          { name: "Van", value: `<@${message.author.id}>` },
          { name: "Reden", value: "Invite link geplaatst"}
        ]
      );
    });
  }

  async massMessageBlocker() {
    const withInSeconds = 5;
    const minimalChannelsSize = 3;

    this.client.on(DiscordEvents.MessageCreate, async (message) => {
      if (isBot(message.author, this.client)) return;

      if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;

      const member = message.member;
      if (!member) return;

      const now = Date.now();
      const userId = member.id;
      const record = this.userMessageMap.get(userId) || { timestamps: [], channels: new Set() };

      record.timestamps = record.timestamps.filter(t => now - t <= withInSeconds * 1000);

      record.timestamps.push(now);
      record.channels.add(message.channel.id);

      this.userMessageMap.set(userId, record);

      if (record.channels.size >= minimalChannelsSize) {
        try {
          await this.addMembertoJail(member.user.id);

          await this.sendNotification(
            "Gebruiker is in onze gevangenis geplaatst!",
            `${member.user.displayName} heeft berichten in ${minimalChannelsSize} of meer kanalen binnen ${withInSeconds} seconden gestuurd en is in de gevangenis geplaatst.`
          );

          await LogToServer.warning(
            "Gebruiker is in onze gevangenis geplaatst!",
            [
              { name: "Wie", value: `<@${member.user.id}>` },
              { name: "Reden", value: "Bericht SPAM"}
            ]
          );
        } catch (err) {
          console.error("Failed to put in jail for user:", err);
        }

        this.userMessageMap.delete(userId);
      }
    });
  }

  async spamWordBlocker() {
    this.client.on(DiscordEvents.MessageCreate, async (message) => {
      if (isBot(message.author, this.client)) return;

      if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;

      const spamWords = [
        "free credits",
        "claim now",
        "free nitro",
        "discord gift"
      ];

      const msgContent = message.content.toLowerCase();
      const isSpam = spamWords.some(word => msgContent.includes(word));

      if (!isSpam) return;

      message.delete().catch(err => console.error("Kon bericht niet verwijderen:", err));

      await this.sendNotification(
        "Bericht automatisch verwijderd",
        `Ik heb een bericht verwijderd van ${message.author.displayName} waar veelvoorkomende SPAM woorden in zaten.`
      );

      await LogToServer.warning(
        "Bericht automatisch verwijderd",
        [
          { name: "Wie", value: `<@${message.author.id}>` },
          { name: "Reden", value: "Bevat veelvoorkomende SPAM woorden"}
        ]
      );
    })
  }

  async sendNotification(title: string, content: string) {
    const channel = await this.client.channels.fetch(getEnv("GENERAL") as string) as TextChannel;

    const embed = new EmbedBuilder()
      .setColor(Color.Blue)
      .setTitle(title)
      .setDescription(content);

    await channel.send({ embeds: [embed] });
  }

  async addMembertoJail(memberId: string) {
    const channel = await this.client.channels.fetch(getEnv("GENERAL") as string) as TextChannel;
    const member = await channel.guild.members.fetch(memberId);

    if (!member) throw new Error("Member not found");

    const jailRoleId = getEnv("JAIL_ROLE_ID");
    const jailRole = channel.guild.roles.cache.get(getEnv("JAIL_ROLE_ID") as string);

    if (!jailRole) throw new Error("Jail role not found");

    await member.roles.add(jailRole, "Toegevoegd aan de gevangenis voor spam gedrag");
  }
}