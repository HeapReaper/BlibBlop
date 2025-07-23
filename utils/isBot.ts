import {
  Client,
  User,
} from 'discord.js';

export function isBot(userObject: User, client: Client) {
  return userObject.id === client.user?.id || userObject.bot;
}