import {JamesTaskRepo} from "../infrastructure/JamesTaskRepo";
import {ConverterUtils} from "../ConverterUtils";

export const CHAT_IDs = [process.env.MA_CHAT_ID, process.env.JO_CHAT_ID];

export class BirthdayReminder {

    jamesRepo: JamesTaskRepo

    constructor(jamesRepo: JamesTaskRepo) {
        this.jamesRepo = jamesRepo
    }

    async sendDailyBirthdayReminder(bot) {
        try {
            let today = ConverterUtils.getToday()
            let todayAsString = today.day + ". " + today.month
            let data = await this.jamesRepo.getBirthdaysForDate(today.day, today.month)
            // get today
            console.log("Daten waren: Datum heute: " + todayAsString);
            console.log("Scan erfolgreich.");
            console.log("Heute gibt es " + data.length + " Geburtstag(e).");
            console.log("Scan erfolgreich.");
            await this.sendBirthdayReminderMessages(bot, data);
        } catch (err) {
            console.error("Tabelle kann nicht gescannt werden. Fehler: ", JSON.stringify(err, null, 2));
        }
    }

    generateBirthdayReminderMessage(birthday) {
        return "Heute hat "
            + birthday.first_name
            + " "
            + birthday.second_name
            + " Geburtstag!\n"
            + "Vergiss nicht zu gratulieren 🎁";
    }


    async sendBirthdayReminderMessages(bot, data) {
        for (const birthday of data.Items) {
            for (const chat_id of CHAT_IDs) {
                try {
                    let message = this.generateBirthdayReminderMessage(birthday);
                    await bot.telegram.sendMessage(chat_id, message);
                    console.log("Chat_ID " + chat_id + " wurde informiert.");
                } catch (err) {
                    console.log("Etwas ist beim Senden der Nachricht schief gelaufen.")
                }
            }
        }
    }
}