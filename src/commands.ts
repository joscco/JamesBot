import {randomUUID} from "crypto";
import {putItem, scanTable} from "./aws_utils";

// Only Accept Orders from Matze or Jonathan
let chat_ids = [process.env.MA_CHAT_ID, process.env.JO_CHAT_ID];

const dateRegex = /^(([1-9]|[12][0-9]|3[01])-([1-9]|1[012]))$/
const nameRegex = /^[a-zäöüßA-ZÄÖÜ-]+$/
const garbageTypeRegex = /^(schwarz|gelb|grün|braun)+$/i

function isDate(input: string): boolean {
    return dateRegex.test(input);
}

function isName(input: string): boolean {
    return input != null && nameRegex.test(input);
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

export async function showNextBirthdays(ctx): Promise<any> {
    let parameters = ctx.update.message.text.split(" ");
    console.log("Starte showNextBirthdays mit Parameter: " + parameters[4]);
    let numberOfDays = parameters[4];
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

    let positiveLogMessage = "Geburtstage gefunden.";
    let negativeAnswer = "Oh nein, da ist was schiefgelaufen...";
    let negativeLogMessage = "Die Suche hat nicht funktioniert. Error JSON:";
    let positiveAction = async (data) => {
        await logAndReply(ctx, positiveLogMessage, buildShowNextBirthdaysAnswer(data, numberOfDays));
    }
    let negativeAction = async (err) => {
        await logAndReply(ctx, negativeLogMessage + JSON.stringify(err, null, 2), negativeAnswer);
    }

    await scanTable(scanArgs, positiveAction, negativeAction);
}

function buildShowNextBirthdaysAnswer(data, numberOfDays: string) {
    let message = "Folgende Personen haben in den nächsten " + numberOfDays + " Tagen Geburstag:\n";
    data.Items.forEach(row => {
        message += row.first_name + " " + row.second_name + " am " + row.date + "\n";
    })
    return message;
}

function logAndReply(ctx, logMessage: string, answer: string) {
    console.log(logMessage);
    ctx.reply(answer);
}

export async function addGarbage(ctx) {
    let parameters = ctx.update.message.text.split(" ");
    if (parameters.length == 3) {
        if (isGarbageType(parameters[1]) && isDate(parameters[2])) {
            let garbageType = parameters[1];
            let garbageDate = parameters[2];
            let item = {
                "event_id": randomUUID(),
                "event_type": "Garbage",
                "date": garbageDate,
                "garbage_type": normalizeGarbageType(garbageType)
            };
            console.log("Füge Müll (" + garbageType + ") am " + garbageDate + " hinzu.");
            let positiveAnswer = "Ich einen Mülltermin (" + garbageType + ") am " + garbageDate + " hinzugefügt";
            let positiveLogMessage = "Mülltermin hinzugefügt.";
            let negativeAnswer = "Oh nein, da ist was schiefgelaufen...";
            let negativeLogMessage = "Kann Item nicht hinzufügen. Error JSON:";
            let positiveAction = async () => {
                await logAndReply(ctx, positiveLogMessage, positiveAnswer);
            }
            let negativeAction = async (err) => {
                await logAndReply(ctx, negativeLogMessage + JSON.stringify(err, null, 2), negativeAnswer);
            }
            await putItem(item, positiveAction, negativeAction);
            console.log("Funktionsaufruf Datenbank ist durch");
        } else {
            ctx.reply("Hmm... Die Parameter sehen nicht richtig aus. Denk dran: Erst Müllfarbe, dann ein Datum wie 31-12 oder 6-7. Und beide Parameter durch Leerzeichen getrennt.");
        }
    } else {
        ctx.reply("Ich brauche zwei Parameter: Müllfarbe und Datum (dd-mm). Bitte nochmal");
    }
}

export async function addBirthday(ctx) {
    let parameters = ctx.update.message.text.split(" ");
    if (parameters.length == 4) {
        if (isName(parameters[1]) && isName(parameters[2]) && isDate(parameters[3])) {
            let firstName = capitalizeFirstLetter(parameters[1]);
            let secondName = capitalizeFirstLetter(parameters[2]);
            let birthdayDate = parameters[3];
            let item = {
                "event_id": randomUUID(),
                "event_type": "Birthday",
                "date": birthdayDate,
                "first_name": firstName,
                "second_name": secondName
            };
            console.log("Füge Geburstag von " + firstName + " " + secondName + " am " + birthdayDate + " hinzu.");
            let positiveAnswer = "Ich habe den Geburstag von " + firstName + " " + secondName + " am " + birthdayDate + " hinzugefügt";
            let positiveLogMessage = "Geburtstag hinzugefügt.";
            let negativeAnswer = "Oh nein, da ist was schiefgelaufen...";
            let negativeLogMessage = "Kann Item nicht hinzufügen. Error JSON:";
            let positiveAction = async () => {
                await logAndReply(ctx, positiveLogMessage, positiveAnswer);
            };
            let negativeAction = async (err) => {
                await logAndReply(ctx, negativeLogMessage + JSON.stringify(err, null, 2), negativeAnswer);
            };
            await putItem(item, positiveAction, negativeAction);
            console.log("Funktionsaufruf Datenbank ist durch");
        } else {
            ctx.reply("Hmm... Die Parameter sehen nicht richtig aus. Denk dran: Erst Vorname, dann Nachname dann ein Datum wie 31-12 oder 6-7. Und alle drei Parameter durch Leerzeichen getrennt.");
        }
    } else {
        ctx.reply("Ich brauche drei Parameter: Vorname, Nachname und Datum (dd-mm). Bitte nochmal");
    }
}

export function deleteBirthday() {
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

export function showNextGarbages() {
}

export function deleteAllGarbage() {
}

export function deleteGarbage() {
}

export function generateHelpText(): string {
    return "Ich helfe dir, dich an Geburtstage und Mülltage zu erinnern.\n"
        + "Die Müllerinnerungen kommen immer einen Abend vorher, die Geburtstagserinnerungen "
        + "kommen morgens. \n\n"
        + "Über folgende Befehle kannst du mich steuern:\n";
}

export async function sendDailyBirthdayReminder(bot) {
    // Get current date as String
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

    let negativeAction = (err) => console.error("Tabelle kann nicht gescannt werden. Fehler: ", JSON.stringify(err, null, 2));
    let positiveAction = async (data) => {
        console.log("Scan erfolgreich.");
        console.log("Gescannte Elemente: " + data.ScannedCount);
        console.log("Heute gibt es " + data.Items.length + " Geburtstag(e).");
        console.log("Daten waren: Datum heute: " + todayAsString);
        for (const birthday of data) {
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
    await scanTable(birthdayArgs, positiveAction, negativeAction);
}

function generateBirthdayReminderMessage(birthday) {
    return "Heute hat "
        + birthday.first_name
        + " "
        + birthday.second_name
        + " Geburtstag!\n"
        + "Vergiss nicht zu gratulieren 🎁";
}

export async function sendDailyGarbageReminder(bot) {
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
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

    let negativeAction = (err) => console.error("Tabelle kann nicht gescannt werden. Fehler: ", JSON.stringify(err, null, 2));
    let positiveAction = async (data) => {
        console.log("Scan erfolgreich.");
        console.log("Gescannte Elemente: " + data.ScannedCount);
        console.log("Heute gibt es " + data.Items.length + " Mülldaten.");
        console.log("Daten waren: Datum morgen: " + tomorrowAsString);
        console.log("Scan erfolgreich.");
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

    await scanTable(garbageArgs, positiveAction, negativeAction);
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
