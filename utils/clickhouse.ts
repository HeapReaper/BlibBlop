import { createClient} from "@clickhouse/client";
import { Message } from "discord.js";
import {Logging} from "@utils/logging";

export const chClient = createClient({
  url: Bun.env.CLICKHOUSE_HOST ?? 'http://localhost:8123',
  username: Bun.env.CLICKHOUSE_USERNAME ?? 'default',
  password: Bun.env.CLICKHOUSE_PASSWORD ?? '',
});

export async function insertMessage(message: Message, edited = false) {
  if (message.partial) return;

  Logging.trace(`Inserting message into ClickHouse from user ${message.author.username}`);

  await chClient.insert({
    table: 'discord_messages',
    values: [{
      id: message.id,
      channel_id: message.channelId,
      author_id: message.author.id,
      content: message.content ?? '',
      timestamp: formatTimestamp(new Date(message.createdTimestamp)),
      edited: edited ? 1 : 0,
      is_reaction: false,
      reaction_emoji: '',
      reacting_user_id: '',
    }],
    format: 'JSONEachRow',
  });
}

export async function insertReaction({
  messageId,
  channelId,
  emoji,
  userId,
  timestamp
}: {
  messageId: string,
  channelId: string,
  emoji: string,
  userId: string,
  timestamp: Date | string
}) {
  function formatTimestamp(date: Date | string): string {
    if (typeof date === 'string') return date.replace('T', ' ').replace(/\.\d+Z$/, '');
    return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  }

  await chClient.insert({
    table: 'discord_messages',
    values: [{
      id: messageId,
      channel_id: channelId,
      author_id: '',
      content: '',
      timestamp: formatTimestamp(timestamp),
      edited: 0,
      is_reaction: 1,
      reaction_emoji: emoji,
      reacting_user_id: userId,
    }],
    format: 'JSONEachRow',
  });
}

export async function isClickhouseOnline(): Promise<boolean> {
  try {
    const resultSet = await chClient.query({
      query: 'SELECT 1',
      format: 'JSONEachRow',
    });
    const result = await resultSet.json();
    // @ts-ignore
    return result?.[0]?.['1'] === 1 || result?.[0]?.['1'] === '1';
  } catch (err) {
    Logging.warn(`ClickHouse is offline or unreachable: ${err}`,);
    return false;
  }
}

function formatTimestamp(date: Date): string {
  return date.toISOString()
    .replace('T', ' ')
    .replace(/\.\d+Z$/, '')
}