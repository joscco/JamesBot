const CHAT_IDs = [process.env.MA_CHAT_ID, process.env.JO_CHAT_ID];

export class IdChecker {

    static isValidID(input: string): boolean {
        return CHAT_IDs.includes(input);
    }

    static getValidChatIds(): string[] {
        return CHAT_IDs
    }

}