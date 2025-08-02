import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Maak tickets aan')
    .addSubcommand(report =>
      report
        .setName('beheer')
        .setDescription('Open een ticket voor het bestuur')
        .addStringOption(option =>
          option
            .setName('reden')
            .setDescription('De reden van het ticket')
            .setRequired(true)
        )
    )
    .addSubcommand(confidential =>
      confidential
        .setName('vertrouwelijk')
        .setDescription('Open een ticket die alleen de eigenaar kan zien')
        .addStringOption(option =>
          option
            .setName('reden')
            .setDescription('De reden van het ticket')
            .setRequired(true)
        )
    )
    .addSubcommand(close =>
      close
        .setName('sluiten')
        .setDescription('Sluit een ticket')
    )
].map(commands => commands.toJSON());
