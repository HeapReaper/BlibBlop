import { getEnv } from '@utils/env';
import { Logging } from '@utils/logging';

export const userStatussen: Record<string, {
  userId: string,
  status: string,
  lastChecked: string | null,
}> = {};

export async function usersOnline(client: any): Promise<void> {
  try {
    const guild = await client.guilds.fetch(getEnv('GUILD_ID') as string);

    const now = new Date();
    const formattedTime = formatDate(now.toISOString());
    const userIds = getEnv('USER_IDS') as string;

    for (const userId of userIds.split(',') || []) {
      try {
        const member = await guild.members.fetch(`${userId}`);
        const status = member.presence?.status || 'offline';

        userStatussen[userId] = {
          userId: member.user.id,
          status,
          lastChecked: formattedTime,
        };
      } catch (err) {
        Logging.warn(`Error fetching member ${userId}: ${err}`,);
        userStatussen[userId] = {
          userId: `${userId}`,
          status: 'error',
          lastChecked: formattedTime,
        };
      }
    }

  } catch (err) {
    console.warn('Error fetching guild:', err);
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
