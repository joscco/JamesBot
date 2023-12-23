import {Context} from "telegraf";

export type CommandContext = Context & {
    update: {
        message: {
            text: string
            from: {
                id: string
            }
        }
    }
}

export function hasValidChatID(ctx: CommandContext): boolean {
    return isValidID(ctx.update.message.from.id.toString());
}

export function isValidID(input: string): boolean {
    return this.chat_ids.includes(input);
}

//         if (hasValidChatID(ctx)) {
//             await jamesCommand.handleContext(ctx);
//         } else {
//             await ctx.reply("Dir gehorche ich nicht.");
//         }




