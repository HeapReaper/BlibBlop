import { Application } from "express";
import {
  Client,
  GuildScheduledEventEntityType,
} from "discord.js";
import { Logging } from "@utils/logging";
import { formatTimestamp } from "@utils/formatDate";

export default function registerApi(app: Application, client: Client) {
  app.get("/api/events", async (req, res) => {
    try {
      const events: any[] = [];

      for (const [, guild] of client.guilds.cache) {
        const scheduledEvents = await guild.scheduledEvents.fetch();

        scheduledEvents.forEach(event => {
          let location: string | null = null;

          if (event.entityType === GuildScheduledEventEntityType.External) {
            location = event.entityMetadata?.location ?? null;
          } else if (event.channel) {
            location = event.channel.name;
          }

          events.push({
            id: event.id,
            name: event.name,
            description: event.description,
            scheduledStartTime: formatTimestamp(event.scheduledStartTimestamp),
            scheduledEndTime: formatTimestamp(event.scheduledEndTimestamp),
            creator: event.creator
              ? {
                  id: event.creator.id,
                  username: event.creator.username,
                }
              : null,
            entityType: event.entityType,
            status: event.status,
            location,
            guildId: guild.id,
            guildName: guild.name,
            image: event.coverImageURL({ size: 1024 }) ?? null,
          });
        });
      }

      res.json(events);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });
}
