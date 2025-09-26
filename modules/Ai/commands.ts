import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Vraag iets aan de lokale gehoste AI.")
    .addSubcommand(add =>
      add
        .setName("vraag")
        .setDescription("Stel je vraag.")
        .addStringOption(option =>
          option
            .setName("prompt")
            .setDescription("Wat wil je vragen aan de AI?")
            .setRequired(true)
        )
    )
].map(commands => commands.toJSON());
