import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Commands voor het giveaway systeem")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub
        .setName("aanmaken")
        .setDescription("Maak een giveaway aan")
        .addIntegerOption(option =>
          option
            .setName("dag")
            .setDescription("Op welke dag eindigt de giveaway?")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("maand")
            .setDescription("In welke maand eindigt de giveaway?")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("jaar")
            .setDescription("In welk jaar eindigt de giveaway?")
            .setRequired(true)
        )
        .addStringOption(option => // tijd beter als string, geen integer
          option
            .setName("tijd")
            .setDescription("Hoelaat eindigt de giveaway? (ex. 16:24)")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("aantal_winnaars")
            .setDescription("Hoeveel winnaars zijn er?")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("prijs")
            .setDescription("Wat is de prijs van deze giveaway?")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("extra_voorwaarden")
            .setDescription("Extra voorwaarden voor deelname")
            .setRequired(true)
        )
        .addBooleanOption(option =>
        option
          .setName("vermeld_iedereen")
          .setDescription("Doe een @everyone")
          .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("verwijder")
        .setDescription("Verwijder een giveaway")
        .addStringOption(option =>
          option
            .setName("id")
            .setDescription("Vul de giveaway ID in")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("lijst")
        .setDescription("Zie alle lopende giveaways")
    )
    .addSubcommand(sub =>
      sub
        .setName("reroll")
        .setDescription("Kies een 2e winnaar uit")
        .addStringOption(option =>
          option
            .setName("id")
            .setDescription("Vul de giveaway ID in")
            .setRequired(true)
        )
    )
].map(command => command.toJSON());
