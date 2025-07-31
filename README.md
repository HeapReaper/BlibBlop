# BlipBlop Commands
BlipBlop is our in-house developed Discord bot for [RC-Garage.nl](https://rc-garage.nl) that helps us with various functions.<br/>
She’s a hardworking assistant!

## Tech Stack & Hosting
- [Coolify](https://coolify.io/) – Open-source and self-hostable alternative to Heroku / Netlify / Vercel.
- [Discord.JS](https://discord.js.org/) – JS/TS Discord bot framework.
- [Docker](https://www.docker.com/) – Container development.
- [ClickHouse](https://clickhouse.com/) – Analytics database.
- [MariaDB](https://mariadb.org/) – Relational database.
- [S3](https://https://www.hetzner.com/storage/object-storage/) – S3 object storage.
- [Hetzner](https://hetzner.cloud/?ref=Lp0CJAumyBNB) – VPS provider (referral link).
- [Pawtect](https://pawtect.nl) – In-house developed anti-bot and anti-spam API.

## Automation
I handle a lot in the background! 👇

### Logging
- <span style="color:orange;">[Event]</span> Message created.
- <span style="color:orange;">[Event]</span> Message deleted.
- <span style="color:orange;">[Event]</span> Message edited.
- <span style="color:orange;">[Event]</span> Emoji added to message.
- <span style="color:orange;">[Event]</span> Emoji removed from message.
- <span style="color:orange;">[Event]</span> Voice channel join.
- <span style="color:orange;">[Event]</span> Voice channel leave.
- <span style="color:orange;">[Event]</span> Voice channel changed.
- <span style="color:orange;">[Event]</span> Member joined.
- <span style="color:orange;">[Event]</span> Member left.
- <span style="color:orange;">[Event]</span> Server ban added.
- <span style="color:orange;">[Event]</span> Server ban removed.
- <span style="color:teal;">[Notification]</span> Sends the team a notification for all of the above.

### Bump
- <span style="color:purple;">[Task]</span> Checks every 20 seconds if the server can be bumped again.
- <span style="color:teal;">[Notification]</span> Sends a notification in [#bump](https://discord.gg/WFw9bcXq4u).

### Birthday
- <span style="color:purple;">[Task]</span> Checks daily at 10:00 if it's someone's birthday.
- <span style="color:teal;">[Notification]</span> If it's someone’s birthday, the bot sends a congratulatory message in [#general](https://discord.gg/jHBFgAdbne).

### Welcome/Goodbye
- <span style="color:orange;">[Event]</span> When someone joins or leaves the server, a message (one of 10 variations) appears in [#general](https://discord.gg/jHBFgAdbne).

### Anti-bot
- <span style="color:orange;">[Event]</span> When someone joins the server, they are checked by [Pawtect](https://pawtect.nl). If they fail the check, the bot applies a timeout.
- <span style="color:orange;">[Event]</span> When someone sends a message, it is checked by [Pawtect](https://pawtect.nl). If it fails the rules, the message is automatically deleted.

### Photo Contest
- <span style="color:orange;">[Event]</span> When a message is posted in [#photo-contest](https://discord.gg/bFjc6pGfQ5), the bot checks if it meets the [rules](https://discord.com/channels/1350811442856726559/1350877019298070689/1397127398218137610). If not, the message is deleted.
- <span style="color:orange;">[Event]</span> When an emoji reaction (vote) is added in [#photo-contest](https://discord.gg/bFjc6pGfQ5), the bot checks if it's valid according to the [rules](https://discord.com/channels/1350811442856726559/1350877019298070689/1397127398218137610). If not, the vote is removed.

### Reminders
- <span style="color:purple;">[Task]</span> Every 19:00 it sends a Disboard review reminder in [#general](https://discord.gg/jHBFgAdbne).

## Commands
For members and admins – here 👇 you’ll find all commands/interactions!

### Birthday
- `/birthday add` – Add your birthday to be announced once a year in [#general](https://discord.gg/jHBFgAdbne)!
- `/birthday remove` – Remove your birthday from the bot.

### Blib
- `/blib` – Get a random variation of "Blib"!

### Member Info (admin)
- `Right-click → Apps → Fetch Member Info` – Displays all important information about a member.
