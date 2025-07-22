import {
    Client,
    TextChannel,
    Events as DiscordEvents,
    GuildMember,
    PartialGuildMember, MessageFlags
} from 'discord.js';
import { getEnv } from '@utils/env';
import { Logging } from '@utils/logging';

export default class Events {
    private client: Client;
    private welcomeMessages: Array<string> = [
        '🎮 | {user}, welkom bij RC Club Nederland! \nOf je nu rijdt, vaart of vliegt – met auto’s, helikopters, vliegtuigen, boten of drones – hier zit je goed!',
        '🔥 | {user}, welkom in de wereld van RC! \nVan brullende motoren op de baan tot rustige landingen op het water – alle piloten en bestuurders zijn hier welkom.',
        '🛩️ | {user}, welkom bij RC Club Nederland! \nOf je nu zweeft met een vliegtuig, drift met een auto, vliegt met een drone, spint met een heli of vaart met een boot – deel je passie!',
        '🚁 | {user}, welkom, RC-liefhebber! \nAuto’s, helikopters, vliegtuigen, boten of drones – alles wat op afstand bestuurd wordt leeft hier.',
        '💬 | {user}, welkom in de community! \nOf je nu over asfalt scheurt, door het luchtruim vliegt of over het water glijdt – wij zijn benieuwd naar jouw RC-verhaal.',
        '✈️ | {user}, welkom aan boord! \nVan luchtacrobatiek met je heli tot high-speed bochten met je RC-auto – hier delen we het allemaal.',
        '🛥️ | {user}, welkom in onze RC-haven! \nAuto, boot, drone, heli of vliegtuig – vaar, rij en vlieg met ons mee in deze hobbywereld.',
        '🌪️ | {user}, welkom bij RC Club Nederland! \nWaar snelheid op vier wielen, precisie in de lucht en kracht op het water samenkomen.',
        '📸 | {user}, welkom! \nLaat je projecten zien – of je nu sleutelt aan een auto, heli, vliegtuig, drone of boot. We zijn benieuwd naar je RC-creaties!',
        '🧰 | {user}, welkom techneut! \nRC-auto’s, helikopters, vliegtuigen, boten en drones – elk project is welkom hier. Laat die setups maar zien!',
    ];
    private goodbyeMessages: Array<string> = [
        '👋 | {user} heeft RC Club Nederland verlaten. \nWe hopen dat je mooie momenten hebt gehad – blijf vooral genieten van de RC-hobby!',
        '🚪 | {user} is vertrokken. \nHopelijk zien we je ooit terug op het asfalt, in de lucht of op het water!',
        '🛩️ | {user} is weggevlogen uit de club. \nBedankt voor je aanwezigheid – veel plezier met je toekomstige RC-avonturen!',
        '🏁 | {user} heeft de race verlaten. \nWe wensen je veel succes met je RC-projecten buiten de server!',
        '🌊 | {user} is van boord gegaan. \nHopelijk heb je genoten van je tijd hier. Tot ziens en veel RC-plezier!',
        '🔧 | {user} is niet langer aan het sleutelen met ons. \nWie weet kruisen onze paden zich weer – blijf bouwen en genieten!',
        '📦 | {user} heeft z’n spullen gepakt en is vertrokken. \nWe hopen dat je blijft vliegen, rijden of varen met passie!',
        '🌤️ | {user} heeft ons luchtruim verlaten. \nBedankt voor je aanwezigheid. Keep soaring!',
        '💨 | {user} is weggereden. \nDe banden zijn misschien koud, maar de herinneringen blijven warm. Tot ziens!',
        '🛠️ | {user} is offline gegaan. \nBedankt voor je bijdrage aan de club – succes met je volgende RC-uitdaging!',
    ];

    constructor(client: Client) {
        this.client = client;
        void this.sendWelcomeMessage();
        void this.onPhotoContestMessage();
        void this.sendLeaveMessage();
    }

    async sendWelcomeMessage(): Promise<void> {
        this.client.on(DiscordEvents.GuildMemberAdd, async (member) => {
            const channel = this.client.channels.cache.get(<string>getEnv('GENERAL')) as TextChannel;
            const welcomeRole = member.guild.roles.cache.get(<string>getEnv('PASSAGIER'));

            const welcomeMessage: string = this.welcomeMessages[Math.floor(Math.random() * this.welcomeMessages.length)];
            await channel.send(welcomeMessage.replace(/{user}/g, `<@${member.user.id}>`));

            if (!channel || !channel.isTextBased()) {
                Logging.error(`Channel not found or is not a text channel in Welcome event`);
                return;
            }

            if (!welcomeRole) {
                Logging.error(`welcomeRole not found in Welcome event`);
                return;
            }

            await member.roles.add(welcomeRole);
        });
    }

    async sendLeaveMessage(): Promise<void> {
        this.client.on(DiscordEvents.GuildMemberRemove, async (member: GuildMember|PartialGuildMember): Promise<void> => {
            const channel = this.client.channels.cache.get(<string>getEnv('GENERAL')) as TextChannel;

            if (!channel || !channel.isTextBased()) {
                Logging.error(`Channel not found or is not a text channel in Welcome event`);
                return;
            }

            if (member.partial) {
                try {
                    member = await member.fetch();
                } catch (error) {
                    Logging.error(`Could not fetch partial member: ${error}`);
                }
            }

            const goodbyeMessage: string = this.goodbyeMessages[Math.floor(Math.random() * this.goodbyeMessages.length)];
            await channel.send(goodbyeMessage.replace(/{user}/g, `<@${member.user.id}>`));
        });
    }

    async onPhotoContestMessage() {
        this.client.on(DiscordEvents.MessageCreate, async (message) => {
            try {
                if (message.author.id === this.client.user?.id || message.author.bot) return;

                if (message.channel.id !== getEnv('PHOTO_CONTEST')) return;

                if (message.attachments.size === 0 || message.attachments.size > 1) {
                    return await message.delete();
                }

                if (message.content.length > 30) return await message.delete();

                const photoContestCh = await this.client.channels.fetch(getEnv('PHOTO_CONTEST') as string) as TextChannel;
                const messages = await photoContestCh.messages.fetch({ limit: 30 });
                const todayAuthorMessages = messages.filter((message) =>
                  this.isToday(message.createdAt) && message.author.id === message.author.id
                );

                if (todayAuthorMessages.size > 1) {
                    await message.delete();
                }

                const notification = await photoContestCh.send({
                    content:
                      'Regels: 1 foto per dag.\nKorte tekst toegestaan.\nChat reacties zijn niet toegestaan.\n' +
                      'Foto moet RC gerelateerd zijn\nGeen hergebruik.\n' +
                      'Geen collages of bewerkte afbeeldingen.\n' +
                      'Alles wordt automatisch verwijderd door de bot als bovenstaande niet aan gehouden wordt.',
                })

                setTimeout(() => {
                    notification.delete();
                }, 5000)
            } catch (error) {
                Logging.error(`Error inside "onPhotoContestMessage": ${error}`);
            }
        })
    }

    isToday(createdAt: Date) {
        const now = new Date();
        return createdAt.getDate() === now.getDate() &&
          createdAt.getMonth() === now.getMonth() &&
          createdAt.getFullYear() === now.getFullYear();
    }
}