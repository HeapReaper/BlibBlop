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

    for (const userId of Bun.env.USER_IDS?.split(',') || []) {
      try {
        const member = await client.guilds.cache.get(guild.id)?.members.fetch(`${userId}`);
        const presence = member.presence;

        userStatussen[userId] = {
          username: member.user.tag,
          status: presence?.status || 'offline',
          lastChecked: formattedTime,
        };

        console.log(`${member.user.tag} is ${presence?.status || 'offline'} (checked at ${formattedTime})`);
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
