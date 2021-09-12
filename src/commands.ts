import {deleteItem, putItem, scanTable} from "./aws_utils";
import {
    BirthdayItem,
    capitalizeFirstLetter,
    CommandContext,
    GarbageItem,
    getCommandParameters,
    getDateAsString, getGarbageDescription,
    isBirthdayDuplicate,
    isDate,
    isGarbageDuplicate,
    isGarbageType,
    isName,
    isNonNegativeNumber,
    JamesCommand,
    logAndReply,
    normalizeGarbageType,
    ValidationResult
} from "./command_utils";
import {randomUUID} from "crypto";

export class AddBirthdayCommand implements JamesCommand {
    commandString = "AddBirthday";
    description = "Geburtstagsdatum hinzufügen.";
    useExample = "/AddBirthday Max Muster 27-3";

    async execute(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let firstName = capitalizeFirstLetter(parameters[0]);
            let secondName = capitalizeFirstLetter(parameters[1]);
            let birthdayDate = parameters[2];
            let item = this.createAddBirthdayItem(firstName, secondName, birthdayDate);

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

    validateParameters(params: string[]): ValidationResult {
        let validationResult = new ValidationResult();
        if (params.length != 3) {
            validationResult.errorMessage = "Ich brauche drei Parameter: Vorname, Nachname und Datum (dd-mm). Bitte nochmal";
            validationResult.hasErrors = true;
        } else if (!(isName(params[0]) && isName(params[1]) && isDate(params[2]))) {
            validationResult.errorMessage = "Hmm... Die Parameter sehen nicht richtig aus. Denk dran: Erst Vorname, dann Nachname dann ein Datum wie 31-12 oder 6-7. Und alle drei Parameter durch Leerzeichen getrennt.";
            validationResult.hasErrors = true;
        } else {
            validationResult.hasErrors = false;
        }
        return validationResult;
    }

    createAddBirthdayItem(firstName: string, secondName: string, birthdayDate: string): BirthdayItem {
        return {
            "event_id": randomUUID(),
            "event_type": "Birthday",
            "date": birthdayDate,
            "first_name": firstName,
            "second_name": secondName
        };
    }

}

export class AddGarbageCommand implements JamesCommand {
    commandString = "AddGarbage";
    description = "Mülldatum hinzufügen.";
    useExample = "/AddGarbage gelb 14-7";

    async execute(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let garbageType = parameters[0];
            let garbageDate = parameters[1];
            let item = this.createAddGarbageItem(garbageType, garbageDate);
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

    validateParameters(params: string[]): ValidationResult {
        let validationResult = new ValidationResult();
        if (params.length != 2) {
            validationResult.errorMessage = "Ich brauche zwei Parameter: Müllfarbe und Datum (dd-mm). Bitte nochmal";
            validationResult.hasErrors = true;
        } else if (!(isGarbageType(params[0]) && isDate(params[1]))) {
            validationResult.errorMessage = "Hmm... Die Parameter sehen nicht richtig aus. Denk dran: Erst Müllfarbe, dann ein Datum wie 31-12 oder 6-7. Und beide Parameter durch Leerzeichen getrennt.";
            validationResult.hasErrors = true;
        } else {
            validationResult.hasErrors = false;
        }
        return validationResult;
    }

    createAddGarbageItem(garbageType: string, garbageDate: string): GarbageItem {
        return {
            "event_id": randomUUID(),
            "event_type": "Garbage",
            "date": garbageDate,
            "garbage_type": normalizeGarbageType(garbageType)
        };
    }

}

export class DeleteGarbageCommand implements JamesCommand {
    commandString = "DeleteGarbage";
    description = "Mülldatum entfernen.";
    useExample = "/DeleteGarbage 14-3";

    async execute(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let date = parameters[0];

            const scanArgs = {
                FilterExpression: "#Type = :birthday and #Date = :date",
                ExpressionAttributeNames: {
                    "#Type": "event_type",
                    "#Date": "date"
                },
                ExpressionAttributeValues: {
                    ":birthday": "Birthday",
                    ":date": date
                }
            };

            let answer: string;
            let logMessage: string;

            let operationResult = await scanTable(scanArgs);
            let data = operationResult.data;
            answer = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen..."
                : "Am " + date + " sind " + data.Count + " Mülltermine gespeichert. Alle diese Termine werde ich löschen.";
            logMessage = operationResult.hasError
                ? "Kann Mülldaten nicht löschen. Error JSON:" + JSON.stringify(operationResult.error, null, 2)
                : "Mülldaten am " + date + " werden gelöscht.";

            await logAndReply(ctx, logMessage, answer);

            if (!operationResult.hasError && data.Count > 0) {
                for (const row of data.Items) {
                    try {
                        await deleteItem(row.event_id);
                        await ctx.reply("Müll (" + row.garbage_type + ") am " + row.date + " gelöscht.");
                    } catch (err) {
                        await ctx.reply("Beim Löschen ist etwas fehlgeschlagen. Error: " + err);
                    }
                }
            }
        }
    }

    validateParameters(params: string[]): ValidationResult {
        let validationResult = new ValidationResult();
        if (params.length != 1) {
            validationResult.errorMessage = "Ich brauche einen Parameter: Datum, an dem die Mülltermine gelöscht werden sollen.";
            validationResult.hasErrors = true;
        } else if (!isDate(params[0])) {
            validationResult.errorMessage = "Hmm... Der Parameter sehen nicht richtig aus. Denk dran: Ich brauche ein Datum.";
            validationResult.hasErrors = true;
        } else {
            validationResult.hasErrors = false;
        }
        return validationResult;
    }
}

export class DeleteAllGarbagesCommand implements JamesCommand {
    commandString = "DeleteAllGarbages";
    description = "Alle gespeicherten Mülldaten entfernen.";
    useExample = "/DeleteAllGarbages";

    async execute(ctx: CommandContext) {
        const scanArgs = {
            FilterExpression: "#Type = :garbage",
            ExpressionAttributeNames: {
                "#Type": "event_type",
            },
            ExpressionAttributeValues: {
                ":garbage": "Garbage",
            }
        };

        let answer: string;
        let logMessage: string;

        let operationResult = await scanTable(scanArgs);
        let data = operationResult.data;
        answer = operationResult.hasError
            ? "Oh nein, da ist was schiefgelaufen..."
            : "Ich habe " + data.Count + " Mülldaten gefunden. Alle diese Daten werde ich löschen.";
        logMessage = operationResult.hasError
            ? "Kann Geburtstag nicht löschen. Error JSON:" + JSON.stringify(operationResult.error, null, 2)
            : "Mülldaten werden gelöscht.";

        await logAndReply(ctx, logMessage, answer);

        if (!operationResult.hasError && data.Count > 0) {
            for (const row of data.Items) {
                try {
                    await deleteItem(row.event_id);
                    await ctx.reply("Mülldatum am " + row.date + " gelöscht.");
                } catch (err) {
                    await ctx.reply("Beim Löschen ist etwas fehlgeschlagen. Error: " + err);
                }
            }
        }
    }
}

export class DeleteBirthdayCommand implements JamesCommand {
    commandString = "DeleteBirthday";
    description = "Geburtstag entfernen.";
    useExample = "/DeleteBirthday Hannah Meier 13-2";

    async execute(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let firstName = capitalizeFirstLetter(parameters[0]);
            let secondName = capitalizeFirstLetter(parameters[1]);

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

            if (!operationResult.hasError && data.Count > 0) {
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

    validateParameters(params: string[]): ValidationResult {
        let validationResult = new ValidationResult();
        if (params.length != 2) {
            validationResult.errorMessage = "Ich brauche zwei Parameter: Vorname und Nachname. Bitte nochmal";
            validationResult.hasErrors = true;
        } else if (!(isName(params[0]) && isName(params[1]))) {
            validationResult.errorMessage = "Hmm... Die Parameter sehen nicht richtig aus. Denk dran: Erst Vorname, dann Nachname. Und beide Parameter durch Leerzeichen getrennt.";
            validationResult.hasErrors = true;
        } else {
            validationResult.hasErrors = false;
        }
        return validationResult;
    }
}

// Ab hier neu
export class ShowNextBirthdaysCommand implements JamesCommand {
    commandString = "ShowNextBirthdays";
    description = "Geburtstage in den nächsten n Tagen anzeigen.";
    useExample = "/ShowNextBirthdays 17";

    async execute(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let numberOfDays = parseInt(parameters[0]);
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

            let filterExpression = "#Type = :birthday and (";

            for (let i = 0; i < Object.keys(titleObject).length / 80; i++) {
                filterExpression += i == 0 ? "" : " or";
                filterExpression += "#Datum IN (" + Object.keys(titleObject).slice(i * 80, (i + 1) * 80) + ")";
            }

            filterExpression += ")";

            const scanArgs = {
                FilterExpression: filterExpression,
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
                : this.buildAnswer(data, numberOfDays);
            let logMessage = operationResult.hasError
                ? "Die Suche hat nicht funktioniert. Error JSON:" + JSON.stringify(operationResult.error, null, 2)
                : "Geburtstage gefunden.";
            await logAndReply(ctx, logMessage, answer);
        }
    }

    buildAnswer(data, numberOfDays: number): string {
        let message = "Folgende Personen haben in den nächsten " + numberOfDays + " Tagen Geburstag:\n";
        data.Items.forEach(row => {
            message += row.first_name + " " + row.second_name + " am " + row.date + "\n";
        })
        return message;
    }

    validateParameters(params: string[]): ValidationResult {
        let validationResult = new ValidationResult();
        if (params.length != 1) {
            validationResult.errorMessage = "Ich brauche einen Parameter: Anzahl der nächsten Tage, in denen ich nach Geburtstagen suchen soll.";
            validationResult.hasErrors = true;
        } else if (!isNonNegativeNumber(params[0])) {
            validationResult.errorMessage = "Hmm... Der Parameter sehen nicht richtig aus. Denk dran: Ich brauche eine Zahl >= 0.";
            validationResult.hasErrors = true;
        } else {
            validationResult.hasErrors = false;
        }
        return validationResult;
    }
}

export class ShowNextGarbagesCommand implements JamesCommand {
    commandString = "ShowNextGarbages";
    description = "Mülldaten in den nächsten n Tagen anzeigen.";
    useExample = "/ShowNextGarbages 14";

    async execute(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let numberOfDays = parseInt(parameters[0]);
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

            let filterExpression = "#Type = :garbage and (";

            for (let i = 0; i < Object.keys(titleObject).length / 80; i++) {
                filterExpression += i == 0 ? "" : " or";
                filterExpression += "#Datum IN (" + Object.keys(titleObject).slice(i * 80, (i + 1) * 80) + ")";
            }

            filterExpression += ")";

            const scanArgs = {
                FilterExpression: filterExpression,
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
                : this.buildAnswer(data, numberOfDays);
            let logMessage = operationResult.hasError
                ? "Die Suche hat nicht funktioniert. Error JSON:" + JSON.stringify(operationResult.error, null, 2)
                : "Mülldaten gefunden.";
            await logAndReply(ctx, logMessage, answer);
        }
    }

    buildAnswer(data, numberOfDays: number) {
        let message = "Folgende Mülldaten gibt es in den nächsten " + numberOfDays + " Tagen:\n";
        data.Items.forEach(row => {
            message += getGarbageDescription(normalizeGarbageType(row.garbage_type)) + " am " + row.date + "\n";
        })
        return message;
    }

    validateParameters(params: string[]): ValidationResult {
        let validationResult = new ValidationResult();
        if (params.length != 1) {
            validationResult.errorMessage = "Ich brauche einen Parameter: Anzahl der nächsten Tage, in denen ich nach Mülldaten suchen soll.";
            validationResult.hasErrors = true;
        } else if (!isNonNegativeNumber(params[0])) {
            validationResult.errorMessage = "Hmm... Der Parameter sehen nicht richtig aus. Denk dran: Ich brauche eine Zahl >= 0.";
            validationResult.hasErrors = true;
        } else {
            validationResult.hasErrors = false;
        }
        return validationResult;
    }
}
