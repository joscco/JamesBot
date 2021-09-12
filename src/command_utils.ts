import {scanTable} from "./aws_utils";
import {Context, NarrowedContext} from "telegraf";
import {Update} from "typegram";
import {MountMap} from "telegraf/typings/telegram-types";

export type CommandContext = NarrowedContext<Context<Update>, MountMap["text"]>;

export class ValidationResult {
    hasErrors: boolean;
    errorMessage: string;
}

export interface JamesCommand {
    commandString: string;
    useExample: string;
    description: string;

    execute(ctx: CommandContext): Promise<void>;
}

export type BirthdayItem = {
    event_id: string,
    event_type: "Birthday",
    date: string,
    first_name: string,
    second_name: string
}

export type GarbageItem = {
    event_id: string,
    event_type: "Garbage",
    date: string,
    garbage_type: string
}

// Only Accept Orders from Matze or Jonathan
let chat_ids = [process.env.MA_CHAT_ID, process.env.JO_CHAT_ID];

const dateRegex = /^(([1-9]|[12][0-9]|3[01])-([1-9]|1[012]))$/
const nameRegex = /^[a-zäöüßA-ZÄÖÜ-]+$/
const nonNegativeNumberRegex = /^[0-9]+$/
const garbageTypeRegex = /^(schwarz|gelb|grün|braun)+$/i
const monthNameRegex = /^(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)+$/i

export function isDate(input: string): boolean {
    return dateRegex.test(input);
}

export function isName(input: string): boolean {
    return input != null && nameRegex.test(input);
}

export function isNonNegativeNumber(input: string): boolean {
    return input != null && nonNegativeNumberRegex.test(input);
}

export function isGarbageType(input: string): boolean {
    return garbageTypeRegex.test(input);
}

export function isMonthName(input: string): boolean {
    return monthNameRegex.test(input);
}

export function normalizeGarbageType(input: string): string {
    return capitalizeFirstLetter(input);
}

export function normalizeMonthName(input: string): string {
    return capitalizeFirstLetter(input);
}

export function capitalizeFirstLetter(input: string): string {
    return input.charAt(0).toUpperCase() + input.slice(1);
}

export function getDateAsString(date: Date): string {
    return (date.getDate()) + "-" + (date.getMonth() + 1);
}

export function monthNameToNumber(monthName: string): number {
    switch (monthName) {
        case "Januar":
            return 1;
        case "Februar":
            return 2;
        case "März":
            return 3;
        case "April":
            return 4;
        case "Mai":
            return 5;
        case "Juni":
            return 6;
        case "Juli":
            return 7;
        case "August":
            return 8;
        case "September":
            return 9;
        case "Oktober":
            return 10;
        case "November":
            return 11;
        case "Dezember":
            return 12;
        default:
            return 0;
    }
}

export function logAndReply(ctx, logMessage: string, answer: string) {
    console.log(logMessage);
    ctx.reply(answer);
}

export async function isBirthdayDuplicate(birthdayItem: BirthdayItem): Promise<boolean> {
    let titleObject = {":birthday": "Birthday"};
    console.log("Object: " + JSON.stringify(titleObject));

    const scanArgs = {
        FilterExpression: "#Type = :birthday and #Datum = :date and #FirstName = :firstName and #SecondName = :secondName",
        ExpressionAttributeNames: {
            "#Datum": "date",
            "#Type": "event_type",
            "#FirstName": "first_name",
            "#SecondName": "second_name"
        },
        ExpressionAttributeValues: {
            ":birthday": "Birthday",
            ":date": birthdayItem.date,
            ":firstName": birthdayItem.first_name,
            ":secondName": birthdayItem.second_name
        }
    };
    let result = await scanTable(scanArgs);
    return result.data.Count > 0;
}

export async function isGarbageDuplicate(garbageItem: GarbageItem): Promise<boolean> {
    const scanArgs = {
        FilterExpression: "#Type = :garbage and #Datum = :date and #GarbageType = :garbageType",
        ExpressionAttributeNames: {
            "#Datum": "date",
            "#Type": "event_type",
            "#GarbageType": "garbage_type"
        },
        ExpressionAttributeValues: {
            ":birthday": "Birthday",
            ":date": garbageItem.date,
            ":garbageType": garbageItem.garbage_type
        }
    };
    let result = await scanTable(scanArgs);
    return result.data.Count > 0;
}


export function getCommandParameters(ctx: CommandContext): string[] {
    return ctx.update.message.text.split(" ").slice(1);
}

export function generateHelpText(commandList: JamesCommand[]): string {
    let helpText = "Ich helfe dir, dich an Geburtstage und Mülltage zu erinnern.\n"
        + "Die Müllerinnerungen kommen immer einen Abend vorher, die für Geburtstage kommen morgens. \n\n"
        + "Über folgende Befehle kannst du mich steuern:\n\n";
    commandList.forEach(command => {
        helpText += "/" + command.commandString + "\n"
            + "(z.B. " + command.useExample + ")\n"
            + command.description + "\n\n";
    })
    return helpText
}

export async function sendDailyBirthdayReminder(bot) {
    let today = new Date();
    let todayAsString = today.getDate() + "-" + (today.getMonth() + 1);

    let birthdayArgs = {
        ProjectionExpression: "first_name, second_name",
        FilterExpression: "#Datum = :today and #Type = :birthday",
        ExpressionAttributeNames: {
            "#Datum": "date",
            "#Type": "event_type"
        },
        ExpressionAttributeValues: {
            ":today": todayAsString,
            ":birthday": "Birthday"
        }
    }

    try {
        let scanResult = await scanTable(birthdayArgs);
        let data = scanResult.data;
        console.log("Daten waren: Datum heute: " + todayAsString);
        console.log("Scan erfolgreich.");
        console.log("Gescannte Elemente: " + data.ScannedCount);
        console.log("Heute gibt es " + data.Items.length + " Geburtstag(e).");
        console.log("Scan erfolgreich.");
        await sendBirthdayReminderMessages(bot, data);
    } catch (err) {
        console.error("Tabelle kann nicht gescannt werden. Fehler: ", JSON.stringify(err, null, 2));
    }
}

function generateBirthdayReminderMessage(birthday) {
    return "Heute hat "
        + birthday.first_name
        + " "
        + birthday.second_name
        + " Geburtstag!\n"
        + "Vergiss nicht zu gratulieren 🎁";
}

function getTomorrow(): Date {
    let date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
}

function getTomorrowAsString(): string {
    return getDateAsString(getTomorrow());
}

function getTodayAsString(): string {
    return getDateAsString(new Date());
}

export async function sendDailyGarbageReminder(bot) {
    let garbageArgs = {
        ProjectionExpression: "garbage_type",
        FilterExpression: "#Datum = :tomorrow and #Type = :garbage",
        ExpressionAttributeNames: {
            "#Datum": "date",
            "#Type": "event_type"
        },
        ExpressionAttributeValues: {
            ":tomorrow": getTomorrowAsString(),
            ":garbage": "Garbage"
        }
    }

    try {
        let scanResult = await scanTable(garbageArgs);
        let data = scanResult.data;
        console.log("Daten waren: Datum morgen: " + getTomorrowAsString());
        console.log("Scan erfolgreich.");
        console.log("Gescannte Elemente: " + data.ScannedCount);
        console.log("Heute gibt es " + data.Items.length + " Mülldaten.");
        console.log("Scan erfolgreich.");
        await sendGarbageReminderMessages(bot, data);
    } catch (err) {
        console.error("Tabelle kann nicht gescannt werden. Fehler: ", JSON.stringify(err, null, 2));
    }
}

export async function sendBirthdayReminderMessages(bot, data) {
    for (const birthday of data.Items) {
        for (const chat_id of chat_ids) {
            try {
                let message = generateBirthdayReminderMessage(birthday);
                await bot.telegram.sendMessage(chat_id, message);
                console.log("Chat_ID " + chat_id + " wurde informiert.");
            } catch (err) {
                console.log("Etwas ist beim Senden der Nachricht schief gelaufen.")
            }
        }
    }
}

async function sendGarbageReminderMessages(bot, data) {
    for (const garbage of data.Items) {
        for (const chat_id of chat_ids) {
            try {
                let message = generateGarbageReminderMessage(garbage);
                await bot.telegram.sendMessage(chat_id, message);
                console.log("Chat_ID " + chat_id + " wurde informiert.");
            } catch (err) {
                console.log("Etwas ist beim Senden der Nachricht schief gelaufen.")
            }
        }
    }
}

export function buildShowMonthDatesScanArgs(monthNumber: number, dateType: string) {
    let stringDays = [];
    for (let n = 1; n <= 31; n++) {
        stringDays.push(n + "-" + monthNumber);
    }

    let titleObject = {":type": dateType};
    let index = 0;
    stringDays.forEach(date => {
        index++;
        let titleKey = ":datum" + index;
        titleObject[titleKey.toString()] = date;
    });
    console.log("Object: " + JSON.stringify(titleObject));

    let filterExpression = "#Type = :type and (";

    for (let i = 0; i < Object.keys(titleObject).length / 80; i++) {
        filterExpression += i == 0 ? "" : " or";
        filterExpression += "#Datum IN (" + Object.keys(titleObject).slice(i * 80, (i + 1) * 80) + ")";
    }

    filterExpression += ")";

    return {
        FilterExpression: filterExpression,
        ExpressionAttributeNames: {
            "#Datum": "date",
            "#Type": "event_type"
        },
        ExpressionAttributeValues: titleObject
    }
}

export function buildShowNextDatesScanArgs(numberOfDays: number, dateType: string) {
    let stringDays = [];
    let today = new Date();

    for (let n = 0; n <= numberOfDays; n++) {
        let dateInNDays = new Date();
        console.log("dateInNDays: " + dateInNDays);
        dateInNDays.setDate(today.getDate() + n);
        stringDays.push(getDateAsString(dateInNDays));
    }

    let titleObject = {":type": dateType};
    let index = 0;
    stringDays.forEach(date => {
        index++;
        let titleKey = ":datum" + index;
        titleObject[titleKey.toString()] = date;
    });
    console.log("Object: " + JSON.stringify(titleObject));

    let filterExpression = "#Type = :type and (";

    for (let i = 0; i < Object.keys(titleObject).length / 80; i++) {
        filterExpression += i == 0 ? "" : " or";
        filterExpression += "#Datum IN (" + Object.keys(titleObject).slice(i * 80, (i + 1) * 80) + ")";
    }

    filterExpression += ")";

    return {
        FilterExpression: filterExpression,
        ExpressionAttributeNames: {
            "#Datum": "date",
            "#Type": "event_type"
        },
        ExpressionAttributeValues: titleObject
    }
}

function generateGarbageReminderMessage(garbage) {
    let type = garbage.garbage_type;
    return "Morgen wird "
        + getGarbageDescription(type)
        + " geholt! Denk dran, die Tonne "
        + getGarbageEmoji(type)
        + " rauszustellen. Wuff!"
}

export function getGarbageDescription(type: string) {
    if (type === "Schwarz") {
        return "der schwarze Müll (Hausmüll)"
    } else if (type === "Grün") {
        return "der grüne Müll (Papier)"
    } else if (type === "Braun") {
        return "der braune Müll (Gartenabfall)"
    } else if (type === "Gelb") {
        return "der gelbe Müll (Plastik)"
    } else {
        return "";
    }
}

export function findNearestDate(itemList) {
    let minValue = 365;
    let minDate = "none";
    let today = getTodayAsString()
    itemList.forEach(row => {
        if (subtract(row.date, today) <= minValue) {
            minValue = subtract(row.date, today);
            minDate = row.date;
        }
    });
    return minDate;
}

function subtract(date1, date2): number {
    let date1Tokens = date1.split("-");
    let date2Tokens = date2.split("-");
    let day1 = parseInt(date1Tokens[0]);
    let month1 = parseInt(date1Tokens[1]);
    let day2 = parseInt(date2Tokens[0]);
    let month2 = parseInt(date2Tokens[1]);

    let distance = (month1 - month2) * 30 + (day1 - day2);
    if (distance <= 0) {
        return 365 - distance;
    } else return distance;
}

export function getGarbageEmoji(type: string) {
    if (type === "Schwarz") {
        return "⚫️"
    } else if (type === "Grün") {
        return "🟢"
    } else if (type === "Braun") {
        return "🟤"
    } else if (type === "Gelb") {
        return "🟡"
    } else {
        return "";
    }
}
