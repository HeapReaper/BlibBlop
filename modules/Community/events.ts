import {
  Client,
  TextChannel,
  Events as DiscordEvents,
  GuildMember,
  PartialGuildMember,
  EmbedBuilder
} from "discord.js";
import { getEnv } from "@utils/env";
import { Logging } from "@utils/logging";
import { Color } from "@enums/ColorEnum";

export default class Events {
    private readonly client: Client;
    private welcomeMessages: Array<string> = [
      "🎮 | {user}, welkom bij RC Club Nederland! \nOf je nu rijdt, vaart of vliegt – met auto’s, helikopters, vliegtuigen, boten of drones – hier zit je goed!\n<@&1417795877157732363>, heten jullie {user} welkom?",
      "🔥 | {user}, welkom in de wereld van RC! \nVan brullende motoren op de baan tot rustige landingen op het water – alle piloten en bestuurders zijn hier welkom.\n<@&1417795877157732363>, geven jullie een warm welkom?",
      "🛩️ | {user}, welkom bij RC Club Nederland! \nOf je nu zweeft met een vliegtuig, drift met een auto, vliegt met een drone, spint met een heli of vaart met een boot – deel je passie!\n<@&1417795877157732363>, zwaaien jullie even?",
      "🚁 | {user}, welkom, RC-liefhebber! \nAuto’s, helikopters, vliegtuigen, boten of drones – alles wat op afstand bestuurd wordt leeft hier.\n<@&1417795877157732363>, maken jullie het gezellig?",
      "💬 | {user}, welkom in de community! \nOf je nu over asfalt scheurt, door het luchtruim vliegt of over het water glijdt – wij zijn benieuwd naar jouw RC-verhaal.\n<@&1417795877157732363>, wie zegt gedag?",
      "✈️ | {user}, welkom aan boord! \nVan luchtacrobatiek met je heli tot high-speed bochten met je RC-auto – hier delen we het allemaal.\n<@&1417795877157732363>, zwaaien jullie de nieuwe piloot binnen?",
      "🛥️ | {user}, welkom in onze RC-haven! \nAuto, boot, drone, heli of vliegtuig – vaar, rij en vlieg met ons mee in deze hobbywereld.\n<@&1417795877157732363>, heten jullie hem/haar welkom aan wal?",
      "🌪️ | {user}, welkom bij RC Club Nederland! \nWaar snelheid op vier wielen, precisie in de lucht en kracht op het water samenkomen.\n<@&1417795877157732363>, zetten jullie de toon?",
      "📸 | {user}, welkom! \nLaat je projecten zien – of je nu sleutelt aan een auto, heli, vliegtuig, drone of boot. We zijn benieuwd naar je RC-creaties!\n<@&1417795877157732363>, klaar om hem/haar te verwelkomen?",
      "🧰 | {user}, welkom techneut! \nRC-auto’s, helikopters, vliegtuigen, boten en drones – elk project is welkom hier. Laat die setups maar zien!\n<@&1417795877157732363>, geven jullie een welkom aan deze bouwer?",
    ];
    private goodbyeMessages: Array<string> = [
      "👋 | {user} heeft RC Club Nederland verlaten. \nWe hopen dat je mooie momenten hebt gehad – blijf vooral genieten van de RC-hobby!",
      "🚪 | {user} is vertrokken. \nHopelijk zien we je ooit terug op het asfalt, in de lucht of op het water!",
      "🛩️ | {user} is weggevlogen uit de club. \nBedankt voor je aanwezigheid – veel plezier met je toekomstige RC-avonturen!",
      "🏁 | {user} heeft de race verlaten. \nWe wensen je veel succes met je RC-projecten buiten de server!",
      "🌊 | {user} is van boord gegaan. \nHopelijk heb je genoten van je tijd hier. Tot ziens en veel RC-plezier!",
      "🔧 | {user} is niet langer aan het sleutelen met ons. \nWie weet kruisen onze paden zich weer – blijf bouwen en genieten!",
      "📦 | {user} heeft z’n spullen gepakt en is vertrokken. \nWe hopen dat je blijft vliegen, rijden of varen met passie!",
      "🌤️ | {user} heeft ons luchtruim verlaten. \nBedankt voor je aanwezigheid. Keep soaring!",
      "💨 | {user} is weggereden. \nDe banden zijn misschien koud, maar de herinneringen blijven warm. Tot ziens!",
      "🛠️ | {user} is offline gegaan. \nBedankt voor je bijdrage aan de club – succes met je volgende RC-uitdaging!",
    ];
    private tagMessages: Array<string> = [
      "Blib blop! 🎉 Jij maakt m’n dag!",
      "Heeey daar! Blip blop vibes incoming 😎✨",
      "Blib blop detected! Tijd voor confetti! 🎊",
      "Ahhhh Blib Blop 😍 jij bent te gek!",
      "Blib blop… echt nu? 🙄",
      "Oke, genoeg blip bloppen 😤",
      "Blib blop?! Weet je wel wat je doet?! 😡",
      "Blib blop… grrrrr… 😠",
    ];

    constructor(client: Client) {
      this.client = client;
      //void this.sendWelcomeMessage();
      void this.sendLeaveMessage();
      void this.tagMessage();
    }

    async sendWelcomeMessage(): Promise<void> {
      this.client.on(DiscordEvents.GuildMemberAdd, async (member) => {
        const channel = this.client.channels.cache.get(<string>getEnv("GENERAL")) as TextChannel;
        const welcomeRole = member.guild.roles.cache.get(<string>getEnv("PASSAGIER"));

        const welcomeMessage: string = this.welcomeMessages[Math.floor(Math.random() * this.welcomeMessages.length)];

        const embed: EmbedBuilder = new EmbedBuilder()
          .setColor(Color.Blue)
          .setTitle('We hebben een nieuw lid in de club!')
          .setDescription(welcomeMessage.replace(/{user}/g, `<@${member.user.id}>`))

        await channel.send({ embeds: [embed] });

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
        const channel = this.client.channels.cache.get(<string>getEnv("GENERAL")) as TextChannel;

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

        const embed: EmbedBuilder = new EmbedBuilder()
          .setColor(Color.Blue)
          .setTitle('Een lid heeft de club verlaten.')
          .setDescription(goodbyeMessage.replace(/{user}/g, `<@${member.user.id}>`))

        await channel.send({ embeds: [embed] });
      });
    }

    async tagMessage(): Promise<void> {
      this.client.on(DiscordEvents.MessageCreate, async (message): Promise<void> => {
        // @ts-ignore
        if (!message.mentions.users.has(this.client.user.id)) return;

        const messageToReact: string = this.tagMessages[Math.floor(Math.random() * this.tagMessages.length)];

        await message.reply({content: messageToReact});
      });
    }
}