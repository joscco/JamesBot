import {JamesTaskRepo} from "../infrastructure/JamesTaskRepo";
import {ConverterUtils} from "../ConverterUtils";
import {IdChecker} from "../IdChecker";

export class GarbageReminder {

    jamesRepo: JamesTaskRepo

    constructor(jamesRepo: JamesTaskRepo) {
        this.jamesRepo = jamesRepo
    }

    async sendDailyGarbageReminder(bot) {
        try {
            let tomorrow = ConverterUtils.getTomorrow()
            let tomorrowAsString = tomorrow.day + ". " + tomorrow.month
            let data = await this.jamesRepo.getGarbagesForDate(tomorrow.day, tomorrow.month);
            console.log("Daten waren: Datum morgen: " + tomorrowAsString);
            console.log("Scan erfolgreich.");
            console.log("Heute gibt es " + data.Items.length + " Mülldaten.");
            console.log("Scan erfolgreich.");
            await this.sendGarbageReminderMessages(bot, data);
        } catch (err) {
            console.error("Tabelle kann nicht gescannt werden. Fehler: ", JSON.stringify(err, null, 2));
        }
    }

    async sendGarbageReminderMessages(bot, data) {
        for (const garbage of data.Items) {
            for (const chat_id of IdChecker.getValidChatIds()) {
                try {
                    let message = this.generateGarbageReminderMessage(garbage);
                    await bot.telegram.sendMessage(chat_id, message);
                    console.log("Chat_ID " + chat_id + " wurde informiert.");
                } catch (err) {
                    console.log("Etwas ist beim Senden der Nachricht schief gelaufen.")
                }
            }
        }
    }

    generateGarbageReminderMessage(garbage) {
        let type = garbage.garbage_type;
        return "Morgen wird "
            + ConverterUtils.getGarbageDescription(type)
            + " geholt! Denk dran, die Tonne "
            + ConverterUtils.getGarbageEmoji(type)
            + " rauszustellen. Wuff!"
    }
}