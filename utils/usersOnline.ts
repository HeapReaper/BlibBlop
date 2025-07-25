import {getEnv} from "@utils/env.ts";

export const userStatussen: Record<string, {
  username: string,
  status: string,
  lastChecked: string | null,
}> = {};

export async function usersOnline(client: any): Promise<void> {
  try {
    const guild = await client.guilds.fetch(Bun.env.GUILD_ID);

    const now = new Date();
    const formattedTime = formatDate(now.toISOString());
    const userIds = getEnv('USER_IDS') as string;

    for (const userId of userIds.split(',') || []) {
      try {
        const member = await guild.members.fetch(`${userId}`);
        const status = member.presence?.status || 'offline';

        userStatussen[userId] = {
          username: member.user.tag,
          status,
          lastChecked: formattedTime,
        };

        console.log(`${member.user.tag} is ${status} (checked at ${formattedTime})`);
      } catch (err) {
        console.error(`Error fetching member ${userId}:`, err);
        userStatussen[userId] = {
          username: '',
          status: 'error',
          lastChecked: formattedTime,
        };
      }
    }

  } catch (err) {
    console.error('Error fetching guild:', err);
  }
}


function formatDate(isoString: string): string {
  const d = new Date(isoString);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  // @ts-ignore
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}
