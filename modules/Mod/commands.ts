import {ApplicationCommandType, ContextMenuCommandBuilder} from 'discord.js';

export const commands = [
  new ContextMenuCommandBuilder()
    .setName('Lid informatie ophalen')
    .setType(ApplicationCommandType.Message)
].map(commands => commands.toJSON());