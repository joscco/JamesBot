import {Markup} from "telegraf";

export class KeyboardUtils {
    static createDayOfMonthKeyboard() {
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

    static createMonthKeyboard() {
        return Markup.keyboard([
            [{ text: "Januar" }, { text: "Februar" }, { text: "März" }],
            [{ text: "April" }, { text: "Mai" }, { text: "Juni" }],
            [{ text: "Juli" }, { text: "August" }, { text: "September" }],
            [{ text: "Oktober" }, { text: "November" }, { text: "Dezember" }],
            [{ text: "Abbrechen" }]
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