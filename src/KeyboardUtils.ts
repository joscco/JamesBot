import {Markup} from "telegraf";
import {ReplyKeyboardMarkup} from "typegram";

export class KeyboardUtils {
    static createDayOfMonthKeyboard(): Markup.Markup<ReplyKeyboardMarkup> {
        return Markup.keyboard([
            ["1", "2", "3", "4", "5", "6", "7"],
            ["8", "9", "10", "11", "12", "13", "14"],
            ["15", "16", "17", "18", "19", "20", "21"],
            ["22", "23", "24", "25", "26", "27", "28"],
            ["29", "30", "31", "Abbrechen"],
        ])
            .oneTime()
            .resize()
    }

    static createMonthKeyboard(): Markup.Markup<ReplyKeyboardMarkup> {
        return Markup.keyboard([
            ["Januar", "Februar", "März"],
            ["April", "Mai", "Juni"],
            ["Juli", "August", "September"],
            ["Oktober", "November", "Dezember"],
            ["Abbrechen"]
        ])
            .oneTime()
            .resize()
    }

    static createGarbageColorKeyboard() {
        return Markup.keyboard([
            ["Schwarz", "Gelb"],
            ["Grün", "Braun"],
            ["Abbrechen"]
        ])
            .oneTime()
            .resize()
    }

    static createExpNumberKeyboard() {
        return Markup.keyboard([
            ["7", "14", "31", "365"],
            ["Abbrechen"]
        ])
            .oneTime()
            .resize()
    }

    static createConfirmKeyboard() {
        return Markup.keyboard([
            ["Ja"],
            ["Abbrechen"]
        ])
            .oneTime()
            .resize()
    }

    static createGarbagePeriodKeyboard() {
        return Markup.keyboard([
            ["14", "28"],
            ["Abbrechen"]
        ])
            .oneTime()
            .resize()
    }
}