import { Client, TextChannel } from 'discord.js';

export default class Events {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }
}
