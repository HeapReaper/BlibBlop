import {
    Client,
    TextChannel,
    Events as DiscordEvents,
    EmbedBuilder,
} from 'discord.js';
import { isBot } from '@utils/isBot';
import QueryBuilder from '@utils/database';
import {Color} from '@enums/ColorEnum';
import {getEnv} from '@utils/env';
import {Logging} from '@utils/logging';

export default class Events {
  private readonly client: Client;
  private cooldown = new Map();
  private blipBlobChannel: TextChannel
  private xpCooldown: number = 30 * 1000 // 30 Seconds
  private earnXp: number = 15; // Amount of xp that can be earned every (above) seconds
  private levelRoleIds = [
    '1400402980074950728', // Level 1
    '1400403032298098738', // Level 2
    '1400403113885700146', // Level 3
    '1400403163487670272', // Level 4
    '1400403222480289802', // Level 5
    '1400403220538327040', // Level 6
    '1400403298250526740', // Level 7
    '1400403296581189643', // Level 8
    '1400403293926330458', // Level 9
    '1400403291522728038', // Level 10+
  ]
  constructor(client: Client) {
    this.client = client;
    this.blipBlobChannel = this.client.channels.cache.get(getEnv('BLIPBLOP') as string) as TextChannel;
    void this.handleNewMessage();
  }

  async handleNewMessage(): Promise<void> {
    this.client.on(DiscordEvents.MessageCreate, async (message) => {
      if (isBot(message.author, this.client)) return;

      const now = Date.now();
      const lastXpTime = this.cooldown.get(message.author.id) || 0;

      // If last message was within x secondes, don't give XP
      if (now - lastXpTime < this.xpCooldown ) return;

      let levelingFromDB = await this.getLeveling(message.author.id);

      if (!levelingFromDB) {
        await this.insertNewUserInLeveling(message.author.id, this.earnXp);
        return;
      }

      let newXp = Number(levelingFromDB.xp) + Number(this.earnXp);

      // If level up
      if (newXp < this.getXpForNextLevel(levelingFromDB.level + 1)) {
        await this.updateLeveling(message.author.id, newXp, levelingFromDB.level);
        return;
      }

      const newLevel = levelingFromDB.level + 1;
      const addIndex = newLevel - 1;
      const removeIndex = levelingFromDB.level - 1;

      try {
        const roleToAdd = this.levelRoleIds[addIndex];
        if (roleToAdd) {
          await message.member?.roles.add(roleToAdd);
          Logging.info(`Added role ${roleToAdd} for level ${newLevel}`);
        }

        const roleToRemove = this.levelRoleIds[removeIndex];
        if (removeIndex >= 0 && roleToRemove) {
          await message.member?.roles.remove(roleToRemove);
          Logging.info(`🗑Removed role ${roleToRemove} for old level ${levelingFromDB.level}`);
        }
      } catch (error) {
        Logging.warn(`Cannot add or remove level roles in Leveling Events: ${error}`);
      }

      await this.updateLeveling(message.author.id, newXp, newLevel);
      await this.sendLevelUpNotification(message.author.id, newXp, newLevel);
    });
  }

  getXpForNextLevel(level: number): number {
    if (level == 0) return 50;

    return 50 * level * level;
  }

  async getLeveling(userId: string): Promise<any> {
    return await QueryBuilder
      .select('leveling')
      .where({ user_id: userId })
      .first();
  }

  async insertNewUserInLeveling(userId: string, xp: number) {
    await QueryBuilder
      .insert('leveling')
      .values({ user_id: userId, xp: xp, level: 0 })
      .execute();

  }

  async updateLeveling(userId: string, xp: number, level: number) {
    await QueryBuilder
      .update('leveling')
      .set({ xp: xp, level: level })
      .where({ user_id: userId })
      .execute();
  }

  async sendLevelUpNotification(userId: string, xp: number, level: number) {
    const channel = this.client.channels.cache.get(getEnv('BLIPBLOP_CHANNEL') as string) as TextChannel;

    if (!channel) {
      Logging.warn('Inside "sendLevelUpNotification" channel was not found!');
    }

    const embed = new EmbedBuilder()
      .setTitle('🎉 Level Up')
      .setColor(Color.AeroBytesBlue)
      .setDescription(`<@${userId}> is nu level **${level}**!`)
      .addFields(
        { name: '📊 XP', value: `${xp}`, inline: true },
        { name: '🏆 Nieuwe rang', value: `${level}`, inline: true }
      );

    await channel.send({ embeds: [embed] });
  }
}
