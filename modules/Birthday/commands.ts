import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('verjaardag')
    .setDescription('Beheer je verjaardag!')
    .addSubcommand(add =>
      add
        .setName('toevoegen')
        .setDescription('Voeg je verjaardag toe!')
        .addIntegerOption(option =>
          option
            .setName('dag')
            .setDescription('Kies de dag van je verjaardag.')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(31)
        )
        .addIntegerOption(option =>
          option
            .setName('maand')
            .setDescription('Kies de maand van je verjaardag.')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(12)
        )
        .addIntegerOption(option =>
          option
            .setName('jaar')
            .setDescription('Vul je geboortejaar in (zoals 2001 of 1992')
            .setRequired(true)
        )
    )
    .addSubcommand(remove =>
      remove
        .setName('verwijderen')
        .setDescription('Verwijder je verjaardag!')
    )
].map(commands => commands.toJSON());
