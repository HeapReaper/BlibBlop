export enum StatusCodes {
  OK = 200,
  FORBIDDEN = 403,
}

export class Pawtect {
  private static async sendRequest(
    endpoint: string,
    payload: any,
    apiKey: string = '',
    method: string = 'POST'
  ): Promise<Response> {
    return await fetch(`https://api.pawtect.nl/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
      },
      body: JSON.stringify(payload),
    });
  }

  static async onMessage(message: any, rules: any): Promise<{ status: StatusCodes; reason: string }> {
    const payload = {
      username: message.author.username,
      author_id: message.author.id,
      channel_id: message.channel.id,
      message_content: message.content,
      message_length: message.content.length,
      message_count: 0,
    };

    const req = await this.sendRequest('event/message', { message: payload, rules });

    if (req.status !== StatusCodes.OK) {
      return {
        status: StatusCodes.FORBIDDEN,
        reason: await req.text(),
      };
    }

    return {
      status: StatusCodes.OK,
      reason: 'Message is allowed',
    };
  }

  static async onJoin(member: import('discord.js').GuildMember, rules: any): Promise<{ status: StatusCodes; reason: string }> {
    const createdAt = member.user.createdAt;
    const now = new Date();
    const accountAgeDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const hasAvatar = !!member.user.avatar;

    const payload = {
      username: member.user.username,
      account_age_days: accountAgeDays,
      has_avatar: hasAvatar,
      rules,
    };

    const req = await this.sendRequest('event/join', payload);

    if (req.status !== StatusCodes.OK) {
      return {
        status: StatusCodes.FORBIDDEN,
        reason: await req.text(),
      };
    }

    return {
      status: StatusCodes.OK,
      reason: 'Join allowed',
    };
  }
}
