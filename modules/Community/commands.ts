import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('blip')
    .setDescription('Blip command')
].map(commands => commands.toJSON());
