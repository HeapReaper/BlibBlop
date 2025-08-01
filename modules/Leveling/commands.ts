import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('level')
    .setDescription('Commands voor ons level systeem')
    .addSubcommand(score =>
      score
        .setName('scorebord')
        .setDescription('Zie de top 10!')
    )
    .addSubcommand(current =>
      current
        .setName('profiel')
        .setDescription('Zie je profiel!')
    )
].map(commands => commands.toJSON());
