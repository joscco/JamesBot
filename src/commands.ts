import {randomUUID} from "crypto";
import {deleteItem, putItem, scanTable} from "./aws_utils";
import {Context, NarrowedContext} from "telegraf";
import {Update} from "typegram";
import {MountMap} from "telegraf/typings/telegram-types";

type CommandContext = NarrowedContext<Context<Update>, MountMap["text"]>;

class ValidationResult {
    hasErrors: boolean;
    errorMessage: string;
}

type BirthdayItem = {
    event_id: string,
    event_type: "Birthday",
    date: string,
    first_name: string,
    second_name: string
}

type GarbageItem = {
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

function isDate(input: string): boolean {
    return dateRegex.test(input);
}

function isName(input: string): boolean {
    return input != null && nameRegex.test(input);
}

function isNonNegativeNumber(input: string): boolean {
    return input != null && nonNegativeNumberRegex.test(input);
}

function isGarbageType(input: string): boolean {
    return garbageTypeRegex.test(input);
}

function normalizeGarbageType(input: string): string {
    return capitalizeFirstLetter(input);
}

function capitalizeFirstLetter(input: string): string {
    return input.charAt(0).toUpperCase() + input.slice(1);
}

function getDateAsString(date: Date): string {
    return (date.getDate()) + "-" + (date.getMonth() + 1);
}

function validateShowNextBirthdaysParameters(params: string[]): ValidationResult {
    let validationResult = new ValidationResult();
    if (params.length != 2) {
        validationResult.errorMessage = "Ich brauche einen Parameter: Anzahl der nächsten Tage, in denen ich nach Geburtstagen suchen soll.";
        validationResult.hasErrors = true;
    } else if (!isNonNegativeNumber(params[1])) {
        validationResult.errorMessage = "Hmm... Der Parameter sehen nicht richtig aus. Denk dran: Ich brauche eine Zahl >= 0.";
        validationResult.hasErrors = true;
    } else {
        validationResult.hasErrors = false;
    }
    return validationResult;
}

function validateShowNextGarbagesParameters(params: string[]): ValidationResult {
    let validationResult = new ValidationResult();
    if (params.length != 2) {
        validationResult.errorMessage = "Ich brauche einen Parameter: Anzahl der nächsten Tage, in denen ich nach Mülldaten suchen soll.";
        validationResult.hasErrors = true;
    } else if (!isNonNegativeNumber(params[1])) {
        validationResult.errorMessage = "Hmm... Der Parameter sehen nicht richtig aus. Denk dran: Ich brauche eine Zahl >= 0.";
        validationResult.hasErrors = true;
    } else {
        validationResult.hasErrors = false;
    }
    return validationResult;
}

export async function showNextBirthdays(ctx: CommandContext): Promise<any> {
    let parameters = getCommandParameters(ctx);
    let validationResult = validateShowNextBirthdaysParameters(parameters);
    if (validationResult.hasErrors) {
        await ctx.reply(validationResult.errorMessage);
    } else {
        let numberOfDays = parseInt(parameters[1]);
        let stringDays = [];
        let today = new Date();

        for (let n = 0; n <= numberOfDays; n++) {
            let dateInNDays = new Date();
            console.log("dateInNDays: " + dateInNDays);
            dateInNDays.setDate(today.getDate() + n);
            stringDays.push(getDateAsString(dateInNDays));
        }

        let titleObject = {":birthday": "Birthday"};
        let index = 0;
        stringDays.forEach(date => {
            index++;
            let titleKey = ":datum" + index;
            titleObject[titleKey.toString()] = date;
        });
        console.log("Object: " + JSON.stringify(titleObject));

        const scanArgs = {
            FilterExpression: "#Type = :birthday and #Datum IN (" + Object.keys(titleObject).toString() + ")",
            ExpressionAttributeNames: {
                "#Datum": "date",
                "#Type": "event_type"
            },
            ExpressionAttributeValues: titleObject
        };

        let operationResult = await scanTable(scanArgs);
        let data = operationResult.data;
        let answer = operationResult.hasError
            ? "Oh nein, da ist was schiefgelaufen..."
            : buildShowNextBirthdaysAnswer(data, numberOfDays);
        let logMessage = operationResult.hasError
            ? "Die Suche hat nicht funktioniert. Error JSON:" + JSON.stringify(operationResult.error, null, 2)
            : "Geburtstage gefunden.";
        await logAndReply(ctx, logMessage, answer);
    }
}

export async function showNextGarbages(ctx: CommandContext) {
    let parameters = getCommandParameters(ctx);
    let validationResult = validateShowNextGarbagesParameters(parameters);
    if (validationResult.hasErrors) {
        await ctx.reply(validationResult.errorMessage);
    } else {
        let numberOfDays = parseInt(parameters[1]);
        let stringDays = [];
        let today = new Date();

        for (let n = 0; n <= numberOfDays; n++) {
            let dateInNDays = new Date();
            console.log("dateInNDays: " + dateInNDays);
            dateInNDays.setDate(today.getDate() + n);
            stringDays.push(getDateAsString(dateInNDays));
        }

        let titleObject = {":garbage": "Garbage"};
        let index = 0;
        stringDays.forEach(date => {
            index++;
            let titleKey = ":datum" + index;
            titleObject[titleKey.toString()] = date;
        });
        console.log("Object: " + JSON.stringify(titleObject));

        const scanArgs = {
            FilterExpression: "#Type = :garbage and #Datum IN (" + Object.keys(titleObject).toString() + ")",
            ExpressionAttributeNames: {
                "#Datum": "date",
                "#Type": "event_type"
            },
            ExpressionAttributeValues: titleObject
        };

        let operationResult = await scanTable(scanArgs);
        let data = operationResult.data;
        let answer = operationResult.hasError
            ? "Oh nein, da ist was schiefgelaufen..."
            : buildShowNextGarbagesAnswer(data, numberOfDays);
        let logMessage = operationResult.hasError
            ? "Die Suche hat nicht funktioniert. Error JSON:" + JSON.stringify(operationResult.error, null, 2)
            : "Mülldaten gefunden.";
        await logAndReply(ctx, logMessage, answer);
    }
}

function buildShowNextBirthdaysAnswer(data, numberOfDays: number) {
    let message = "Folgende Personen haben in den nächsten " + numberOfDays + " Tagen Geburstag:\n";
    data.Items.forEach(row => {
        message += row.first_name + " " + row.second_name + " am " + row.date + "\n";
    })
    return message;
}

function buildShowNextGarbagesAnswer(data, numberOfDays: number) {
    let message = "Folgende Mülldaten gibt es in den nächsten " + numberOfDays + " Tagen:\n";
    data.Items.forEach(row => {
        message += getGarbageDescription(normalizeGarbageType(row.garbage_type)) + " am " + row.date + "\n";
    })
    return message;
}

function logAndReply(ctx, logMessage: string, answer: string) {
    console.log(logMessage);
    ctx.reply(answer);
}

async function isBirthdayDuplicate(birthdayItem: BirthdayItem): Promise<boolean> {
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

async function isGarbageDuplicate(garbageItem: GarbageItem): Promise<boolean> {
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

export async function addGarbage(ctx: CommandContext) {
    let parameters = getCommandParameters(ctx);
    let validationResult = validateAddGarbageParameters(parameters);
    if (validationResult.hasErrors) {
        await ctx.reply(validationResult.errorMessage);
    } else {
        let garbageType = parameters[1];
        let garbageDate = parameters[2];
        let item = createAddGarbageItem(garbageType, garbageDate);
        let isDuplicate = await isGarbageDuplicate(item);

        let answer: string;
        let logMessage: string;

        if (isDuplicate) {
            answer = "Danke, aber diesen Eintrag habe ich bereits. Versuch's nochmal :)";
            logMessage = "Duplikat gefunden. Eintrag wird nicht hinzugefügt.";
        } else {
            console.log("Füge Müll (" + garbageType + ") am " + garbageDate + " hinzu.");
            let operationResult = await putItem(item);
            answer = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen..."
                : "Ich einen Mülltermin (" + garbageType + ") am " + garbageDate + " hinzugefügt";
            logMessage = operationResult.hasError
                ? "Kann Item nicht hinzufügen. Error JSON:" + JSON.stringify(operationResult.error, null, 2)
                : "Mülltermin hinzugefügt.";
        }
        await logAndReply(ctx, logMessage, answer);
    }
}

function getCommandParameters(ctx: CommandContext) {
    return ctx.update.message.text.split(" ");
}

function validateAddGarbageParameters(params: string[]): ValidationResult {
    let validationResult = new ValidationResult();
    if (params.length != 3) {
        validationResult.errorMessage = "Ich brauche zwei Parameter: Müllfarbe und Datum (dd-mm). Bitte nochmal";
        validationResult.hasErrors = true;
    } else if (!(isGarbageType(params[1]) && isDate(params[2]))) {
        validationResult.errorMessage = "Hmm... Die Parameter sehen nicht richtig aus. Denk dran: Erst Müllfarbe, dann ein Datum wie 31-12 oder 6-7. Und beide Parameter durch Leerzeichen getrennt.";
        validationResult.hasErrors = true;
    } else {
        validationResult.hasErrors = false;
    }
    return validationResult;
}

function validateAddBirthdayParameters(params: string[]): ValidationResult {
    let validationResult = new ValidationResult();
    if (params.length != 4) {
        validationResult.errorMessage = "Ich brauche drei Parameter: Vorname, Nachname und Datum (dd-mm). Bitte nochmal";
        validationResult.hasErrors = true;
    } else if (!(isName(params[1]) && isName(params[2]) && isDate(params[3]))) {
        validationResult.errorMessage = "Hmm... Die Parameter sehen nicht richtig aus. Denk dran: Erst Vorname, dann Nachname dann ein Datum wie 31-12 oder 6-7. Und alle drei Parameter durch Leerzeichen getrennt.";
        validationResult.hasErrors = true;
    } else {
        validationResult.hasErrors = false;
    }
    return validationResult;
}

function validateDeleteBirthdayParameters(params: string[]): ValidationResult {
    let validationResult = new ValidationResult();
    if (params.length != 3) {
        validationResult.errorMessage = "Ich brauche zwei Parameter: Vorname und Nachname. Bitte nochmal";
        validationResult.hasErrors = true;
    } else if (!(isName(params[1]) && isName(params[2]))) {
        validationResult.errorMessage = "Hmm... Die Parameter sehen nicht richtig aus. Denk dran: Erst Vorname, dann Nachname. Und beide Parameter durch Leerzeichen getrennt.";
        validationResult.hasErrors = true;
    } else {
        validationResult.hasErrors = false;
    }
    return validationResult;
}


function createAddBirthdayItem(firstName: string, secondName: string, birthdayDate: string): BirthdayItem {
    return {
        "event_id": randomUUID(),
        "event_type": "Birthday",
        "date": birthdayDate,
        "first_name": firstName,
        "second_name": secondName
    };
}

function createAddGarbageItem(garbageType: string, garbageDate: string): GarbageItem {
    return {
        "event_id": randomUUID(),
        "event_type": "Garbage",
        "date": garbageDate,
        "garbage_type": normalizeGarbageType(garbageType)
    };
}

export async function addBirthday(ctx: CommandContext) {
    let parameters = getCommandParameters(ctx);
    let validationResult = validateAddBirthdayParameters(parameters);
    if (validationResult.hasErrors) {
        await ctx.reply(validationResult.errorMessage);
    } else {
        let firstName = capitalizeFirstLetter(parameters[1]);
        let secondName = capitalizeFirstLetter(parameters[2]);
        let birthdayDate = parameters[3];
        let item = createAddBirthdayItem(firstName, secondName, birthdayDate);

        let isDuplicate = await isBirthdayDuplicate(item);
        let answer: string;
        let logMessage: string;

        if (isDuplicate) {
            answer = "Danke, aber diesen Eintrag habe ich bereits. Versuch's nochmal :)";
            logMessage = "Duplikat gefunden. Eintrag wird nicht hinzugefügt.";
        } else {
            console.log("Füge Geburstag von " + firstName + " " + secondName + " am " + birthdayDate + " hinzu.");
            let operationResult = await putItem(item);
            answer = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen..."
                : "Ich habe den Geburstag von " + firstName + " " + secondName + " am " + birthdayDate + " hinzugefügt";
            logMessage = operationResult.hasError
                ? "Kann Item nicht hinzufügen. Error JSON:" + JSON.stringify(operationResult.error, null, 2)
                : "Geburtstag hinzugefügt.";
        }
        await logAndReply(ctx, logMessage, answer);
    }
}

export async function deleteBirthday(ctx: CommandContext) {
    let parameters = getCommandParameters(ctx);
    let validationResult = validateDeleteBirthdayParameters(parameters);
    if (validationResult.hasErrors) {
        await ctx.reply(validationResult.errorMessage);
    } else {
        let firstName = capitalizeFirstLetter(parameters[1]);
        let secondName = capitalizeFirstLetter(parameters[2]);

        const scanArgs = {
            FilterExpression: "#Type = :birthday and #FirstName = :firstName and #SecondName = :secondName",
            ExpressionAttributeNames: {
                "#Type": "event_type",
                "#FirstName": "first_name",
                "#SecondName": "second_name"
            },
            ExpressionAttributeValues: {
                ":birthday": "Birthday",
                ":firstName": firstName,
                ":secondName": secondName
            }
        };

        let answer: string;
        let logMessage: string;

        let operationResult = await scanTable(scanArgs);
        let data = operationResult.data;
        answer = operationResult.hasError
            ? "Oh nein, da ist was schiefgelaufen..."
            : "Die genannte Person (" + firstName + " " + secondName + ") ist " + data.Count + " mal gespeichert. Alle diese Daten werde ich löschen.";
        logMessage = operationResult.hasError
            ? "Kann Geburtstag nicht löschen. Error JSON:" + JSON.stringify(operationResult.error, null, 2)
            : "Geburtstag gelöscht.";

        await logAndReply(ctx, logMessage, answer);

        if (operationResult.hasError && data.Count > 0) {
            for (const row of data.Items) {
                try {
                    await deleteItem(row.event_id);
                    await ctx.reply("Datum " + row.date + " gelöscht.");
                } catch (err) {
                    await ctx.reply("Beim Löschen ist etwas fehlgeschlagen. Error: " + err);
                }
            }
        }
    }
}

export function showSpecificBirthday() {
}

export function showNextSpecificGarbage() {
}

export function showGarbagesNextMonth() {
}

export function showBirthdaysForMonth() {
}

export function showGarbagesThisMonth() {
}

export function deleteAllGarbage() {
}

export function deleteGarbage() {
}

export function showBirthdaysThisMonth() {
}

export function showGarbagesForMonth() {
}

export function generateHelpText(): string {
    return "Ich helfe dir, dich an Geburtstage und Mülltage zu erinnern.\n"
        + "Die Müllerinnerungen kommen immer einen Abend vorher, die Geburtstagserinnerungen "
        + "kommen morgens. \n\n"
        + "Über folgende Befehle kannst du mich steuern:\n";
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

export async function sendDailyGarbageReminder(bot) {
    let tomorrow = getTomorrow();
    let tomorrowAsString = (tomorrow.getDate()) + "-" + (tomorrow.getMonth() + 1);
    let garbageArgs = {
        ProjectionExpression: "garbage_type",
        FilterExpression: "#Datum = :tomorrow and #Type = :garbage",
        ExpressionAttributeNames: {
            "#Datum": "date",
            "#Type": "event_type"
        },
        ExpressionAttributeValues: {
            ":tomorrow": tomorrowAsString,
            ":garbage": "Garbage"
        }
    }

    try {
        let scanResult = await scanTable(garbageArgs);
        let data = scanResult.data;
        console.log("Daten waren: Datum morgen: " + tomorrowAsString);
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

function generateGarbageReminderMessage(garbage) {
    let type = garbage.garbage_type;
    return "Morgen wird "
        + getGarbageDescription(type)
        + " geholt! Denk dran, die Tonne "
        + getGarbageEmoji(type)
        + " rauszustellen. Wuff!"
}

function getGarbageDescription(type: string) {
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

function getGarbageEmoji(type: string) {
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
