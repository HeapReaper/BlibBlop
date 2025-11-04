import {
  Client,
  TextChannel,
  Events as DiscordEvents,
  Message,
  Collection
} from "discord.js";
import { getEnv } from "@utils/env";
import { isBot } from "@utils/isBot";
import { Logging } from "@utils/logging.ts";
import { LogToServer } from "@utils/logToServer.ts";

export default class Events {
  private readonly client: Client;
  private readonly introChannel: TextChannel;

  constructor(client: Client) {
    this.client = client;
    this.introChannel = this.client.channels.cache.get(getEnv("INTRO") as string) as TextChannel;
    //void this.bootEvent();
  }

  async bootEvent(): Promise<void> {
    this.client.on(DiscordEvents.MessageCreate, async (message) => {
      if (isBot(message.author, this.client)) return;

      if (message.channel.id !== (getEnv("INTRO") as string)) return;

      Logging.info("Checking if user has already posted in intro channel");

      const allMessages = await this.fetchAllMessages(this.introChannel);

      const userMessages = allMessages.filter(
        (msg) => msg.author.id === message.author.id && msg.id !== message.id
      );

      if (userMessages.size >= 1) {
        Logging.info("Deleted intro channel message (user already posted)");

        await message.delete();

        await LogToServer.warning(`[bot] Bericht verwijderd`, [
          { name: "Van", value: `<@${message.author.id}>`},
          { name: "Kanaal", value: `<#${message.channel.id}>`},
          { name: "Reden", value: `Meer dan 1 bericht in introductie kanaal`},
        ]);
      }

      //await message.react("👋");
    });
  }

  private async fetchAllMessages(channel: TextChannel): Promise<Collection<string, Message>> {
    let messages: Collection<string, Message> = new Collection();
    let lastId: string | undefined;

    while (true) {
      const fetched = await channel.messages.fetch({
        limit: 100,
        before: lastId
      });

      if (fetched.size === 0) break;

      messages = messages.concat(fetched);
      lastId = fetched.last()?.id;
    }

    return messages;
  }
}
