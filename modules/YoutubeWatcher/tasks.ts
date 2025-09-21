import { Client, TextChannel, EmbedBuilder } from "discord.js";
import cron from "node-cron";
import { XMLParser } from "fast-xml-parser";
import { formatIsoDate } from "@utils/formatDate";
import { getEnv } from "@utils/env";
import { Color } from "@enums/ColorEnum";

type Videos = Record<string, string>;

export default class Tasks {
	private readonly client: Client;
	private readonly baseUrl: string;
	private readonly youtubeChannels: string[];
	private lastVideos: Videos = {};

	constructor(client: Client) {
		this.client = client;
		this.baseUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=";
		this.youtubeChannels = [
			"UCH2_Jj8m4Zbe26UMlGG_LVA", // Kevin Talbot
			"UC4Q7GgIQ4kFXnZ3XIBFgUig", // Traxxas
			"UC023gC8PR8vi2ZaREU0i0XQ", // ArrmaRC
			"UC9zTuyWffK9ckEz1216noAw", // FliteTest
			"UCPCw5ycqW0fme1BdvNqOxbw", // Project Air
			"UC7yF9tV4xWEMZkel7q8La_w", // Peter Sripol
		];

		void this.task();
		cron.schedule("* * * * *", async () => {
			await this.task();
		});
	}

	async task() {
		console.log("Running task");

		const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

		for (const channel of this.youtubeChannels) {
			console.log("Looping through channels");

			const url = `${this.baseUrl}${channel}`;
			const res = await fetch(url);
			const xml = await res.text();
			const json = parser.parse(xml);

			const feed = json.feed;
			const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
			const lastVideo = entries[0];

			if (!lastVideo) continue;

			const videoId = lastVideo["yt:videoId"];

			const thumbnailUrl = lastVideo["media:group"]["media:thumbnail"]?.url
				|| `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

			if (!(channel in this.lastVideos)) {
				this.lastVideos[channel] = videoId;
				continue;
			}

			if (this.lastVideos[channel] === videoId) continue;

			const title = lastVideo.title;
			const link = lastVideo.link?.href || `https://www.youtube.com/watch?v=${videoId}`;
			const pubDate = lastVideo.published;
			const author = lastVideo.author?.name || feed.author?.name || "Unknown";
			const authorUrl = lastVideo.author?.uri || `https://www.youtube.com/channel/${channel}`;

			const description = lastVideo["media:group"]?.["media:description"]?.slice(0, 200) || "";

			const channelPicture = await this.getYoutubeChannelImage(channel);

			this.lastVideos[channel] = videoId;

			await this.sendNotification(title, link, pubDate, author, thumbnailUrl, description, authorUrl, channelPicture);
		}
	}

	async getYoutubeChannelImage(channelId: string) {
		const url = `https://www.youtube.com/channel/${channelId}/about`;

		try {
			const response = await fetch(url);
			const html = await response.text();

			const match = html.match(/<meta property="og:image" content="(.*?)">/);

			if (match && match[1]) {
				return match[1];
			}
		} catch (err) {
			console.error("Error fetching channel image:", err);
			return null;
		}
	}

	async sendNotification(
		title: string,
		url: string,
		pubDate: string,
		author: string,
		thumbnail: string,
		description: string,
		authorUrl: string,
		channelPicture: string | null | undefined,
	) {
		const channel: TextChannel = await this.client.channels.fetch(getEnv("YOUTUBE_WATCHER") as string) as TextChannel;

		const embed: EmbedBuilder = new EmbedBuilder()
			.setColor(Color.Blue)
			.setTitle(title)
			.setURL(url)
			.setImage(thumbnail)
			.setDescription(description.slice(0, 40) + "...")
			.setAuthor({
				name: author,
				iconURL: channelPicture ? channelPicture : "https://placehold.co/80x80",
				url: authorUrl
			})
			.setFooter({ text: `Uitgekomen op: ${formatIsoDate(pubDate)}` });

		await channel.send({ embeds: [embed] });
	}
}
