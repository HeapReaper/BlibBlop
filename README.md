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
- [Event] Message created.
- [Event] Message deleted.
- [Event] Message edited.
- [Event] Emoji added to message.
- [Event] Emoji removed from message.
- [Event] Voice channel join.
- [Event] Voice channel leave.
- [Event] Voice channel changed.
- [Event] Member joined.
- [Event] Member left.
- [Event] Server ban added.
- [Event] Server ban removed.
- [Notification] Sends the team a notification for all of the above.

### Bump
- <[Task] Checks every 20 seconds if the server can be bumped again.
- [Notification] Sends a notification in [#bump](https://discord.gg/WFw9bcXq4u).

### Birthday
- [Task] Checks daily at 10:00 if it's someone's birthday.
- [Notification] If it's someone’s birthday, the bot sends a congratulatory message in [#general](https://discord.gg/jHBFgAdbne).

### Welcome/Goodbye
- [Event] When someone joins or leaves the server, a message (one of 10 variations) appears in [#general](https://discord.gg/jHBFgAdbne).

### Anti-bot
- [Event] When someone joins the server, they are checked by [Pawtect](https://pawtect.nl). If they fail the check, the bot applies a timeout.
- [Event] When someone sends a message, it is checked by [Pawtect](https://pawtect.nl). If it fails the rules, the message is automatically deleted.

### Photo Contest
- [Event] When a message is posted in [#photo-contest](https://discord.gg/bFjc6pGfQ5), the bot checks if it meets the [rules](https://discord.com/channels/1350811442856726559/1350877019298070689/1397127398218137610). If not, the message is deleted.
- [Event] When an emoji reaction (vote) is added in [#photo-contest](https://discord.gg/bFjc6pGfQ5), the bot checks if it's valid according to the [rules](https://discord.com/channels/1350811442856726559/1350877019298070689/1397127398218137610). If not, the vote is removed.

### Reminders
- [Task] Every 19:00 it sends a Disboard review reminder in [#general](https://discord.gg/jHBFgAdbne).

### Leveling
- [Event] Every 30 seconds add XP to members when they are chatting.
- [Notification] If member exceeds a given XP (50 x level x level), send notification in [#blipblop](#).

## Commands
For members and admins – here 👇 you’ll find all commands/interactions!

### Birthday
- `/birthday add` – Add your birthday to be announced once a year in [#general](https://discord.gg/jHBFgAdbne)!
- `/birthday remove` – Remove your birthday from the bot.

### Blib
- `/blib` – Get a random variation of "Blib"!

### Member Info (admin)
- `Right-click → Apps → Fetch Member Info` – Displays all important information about a member.

### Leveling
- `/level scorebord` - See the current top 10 people.
- `/level profiel` - See your own profile.