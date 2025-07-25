import {getEnv} from "@utils/env.ts";
import {Logging} from "@utils/logging.ts";

export const userStatussen: Record<string, {
  userId: string,
  status: string,
  lastChecked: string | null,
}> = {};

export async function usersOnline(client: any): Promise<void> {
  try {
    const guild = await client.guilds.fetch('1350811442856726559');

    const now = new Date();
    const formattedTime = formatDate(now.toISOString());
    const userIds = "632677231113666601,321272615052378113,1350816171741417563";

    for (const userId of userIds.split(',') || []) {
      Logging.debug(`${userId}`);
      try {
        const member = await guild.members.fetch(`${userId}`);
        const status = member.presence?.status || 'offline';

        userStatussen[userId] = {
          userId: member.user.id,
          status,
          lastChecked: formattedTime,
        };
      } catch (err) {
        Logging.error(`Error fetching member ${userId}: ${err}`,);
        userStatussen[userId] = {
          userId: `${userId}`,
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
