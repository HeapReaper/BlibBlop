import { Client, TextChannel, EmbedBuilder } from "discord.js";
import { Logging } from "@utils/logging";
import QueryBuilder from "@utils/database";
import { getEnv } from "@utils/env.ts";
import cron from "node-cron";
import { calcAge } from "@utils/age";
import { Color } from "@enums/ColorEnum";
import { DateTime } from "luxon";

let instance: Tasks | null = null;

export default class Tasks {
  private client: Client;

  constructor(client: Client) {
    this.client = client;

    if (instance) return;
    instance = this;

    cron.schedule("0 10 * * *", async (): Promise<void> => {
      Logging.debug("Running Cron 'checkBirthdays'");
      void this.checkBirthdays();
    });
  }

  async checkBirthdays(): Promise<void> {
    const now = DateTime.now().setZone("Europe/Amsterdam");
    const birthdays: any[] = await QueryBuilder.select("birthday").get();

    for (const birthday of birthdays) {
      const birthdayDate = DateTime.fromJSDate(
        new Date(birthday.birthdate),
      ).setZone("Europe/Amsterdam");

      if (birthdayDate.month !== now.month || birthdayDate.day !== now.day) {
        continue;
      }

      const user = await this.client.users.fetch(`${birthday.user_id}`);
      const channelToSend = this.client.channels.cache.get(
        getEnv("GENERAL") as string,
      ) as TextChannel;

      if (!channelToSend) {
        Logging.warn("I cannot find channel to send birthday notification to!");
        return;
      }

      const age = now.year - birthdayDate.year;

      const embed = new EmbedBuilder()
        .setColor(0x2563eb)
        .setTitle("RC Garage")
        .setDescription(
          `Hey ${user},\ngefeliciteerd met je ${age}e verjaardag!\n🎊💪`,
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      await channelToSend.send({ embeds: [embed] });
    }
  }
}
