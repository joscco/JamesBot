import {deleteItem, putItem, scanTable} from "./aws_utils";
import {
    addDaysTo,
    BirthdayItem, buildShowMonthDatesScanArgs, buildShowNextDatesScanArgs,
    capitalizeFirstLetter,
    CommandContext, findNearestDate,
    GarbageItem,
    getCommandParameters,
    getGarbageDescription,
    isBirthdayDuplicate,
    isDate,
    isGarbageDuplicate,
    isGarbageType, isMonthName,
    isName,
    isNonNegativeNumber,
    JamesCommand,
    logReply, monthNameToNumber,
    normalizeGarbageType, normalizeMonthName, subtract,
    ValidationResult
} from "./command_utils";
import {randomUUID} from "crypto";

export class AddBirthdayCommand implements JamesCommand {
    commandString = "ab";
    description = "Geburtstagsdatum hinzufügen.";
    useExample = "/ab Max Muster 27-3";

    async handleContext(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (!validationResult.hasErrors) {
            let firstName = capitalizeFirstLetter(parameters[0]);
            let secondName = capitalizeFirstLetter(parameters[1]);
            let birthdayDate = parameters[2];
            let item = this.createAddBirthdayItem(firstName, secondName, birthdayDate);

            let isDuplicate = await isBirthdayDuplicate(item);
            let logMessage: string;

            if (isDuplicate) {
                logMessage = "Danke, aber diesen Eintrag habe ich bereits. Versuch's nochmal :)";
            } else {
                console.log("Füge Geburstag von " + firstName + " " + secondName + " am " + birthdayDate + " hinzu.");
                let operationResult = await putItem(item);
                logMessage = operationResult.hasError
                    ? "Oh nein, da ist was schiefgelaufen..." + JSON.stringify(operationResult.error, null, 2)
                    : "Ich habe den Geburstag von " + firstName + " " + secondName + " am " + birthdayDate + " hinzugefügt";
            }
            await logReply(ctx, logMessage);
        } else {
            await ctx.reply(validationResult.errorMessage);
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
    commandString = "ag";
    description = "Mülldatum hinzufügen.";
    useExample = "/ag gelb 14-7";

    async handleContext(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            await this.execute(parameters[0], parameters[1], ctx);
        }
    }

    async execute(garbageType, garbageDate, ctx) {
        let item = this.createAddGarbageItem(garbageType, garbageDate);
        let isDuplicate = await isGarbageDuplicate(item);

        let logMessage: string;

        if (isDuplicate) {
            logMessage = "Danke, aber diesen Eintrag habe ich bereits. Versuch's nochmal :)";
        } else {
            await ctx.reply("Füge Müll (" + garbageType + ") am " + garbageDate + " hinzu.");
            let operationResult = await putItem(item);
            logMessage = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen..." + JSON.stringify(operationResult.error, null, 2)
                : "Ich einen Mülltermin (" + garbageType + ") am " + garbageDate + " hinzugefügt";
        }
        await logReply(ctx, logMessage);
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

export class AddPeriodicGarbageCommand implements JamesCommand {
    commandString = "apg";
    description = "Periodisches Mülldatum mit Anfangstag, Zeitraumende und Periode (in Wochen) hinzufügen.";
    useExample = "/apg gelb 4-1 4";

    async handleContext(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let garbageType = parameters[0];
            let garbageStartDate = parameters[1];
            let period = parseInt(parameters[2]);
            let garbageDates = this.createGarbageDates(garbageStartDate, period);
            await ctx.reply("Garbage Dates I generated: " + garbageDates);
            for (let garbageDate of garbageDates) {
                let addCommand = new AddGarbageCommand();
                await addCommand.execute(garbageType, garbageDate, ctx)
            }
        }
    }

    validateParameters(params: string[]): ValidationResult {
        let validationResult = new ValidationResult();
        if (params.length != 3) {
            validationResult.errorMessage = "Ich brauche drei Parameter: Müllfarbe, Anfangsdatum (dd-mm) und eine Periode. Bitte nochmal";
            validationResult.hasErrors = true;
        } else if (!(isGarbageType(params[0]) && isDate(params[1]) && isNonNegativeNumber(params[2]))) {
            validationResult.errorMessage = "Hmm... Die Parameter sehen nicht richtig aus. Denk dran: Erst Müllfarbe, dann ein Datum für den Start wie 31-12 oder 6-7. Schließlich noch eine Zahl, die die Periodenlänge in Wochen angibt. Und alle Parameter durch Leerzeichen getrennt.";
            validationResult.hasErrors = true;
        } else {
            validationResult.hasErrors = false;
        }
        return validationResult;
    }

    createGarbageDates(garbageStartDate: string, period: number): string[] {
        let numberOfDates = subtract("31-12", garbageStartDate)/(7 * period);
        let currentDate: string = garbageStartDate;
        let result = [];
        for (let i = 0; i < numberOfDates; i++) {
            result.push(currentDate);
            currentDate = addDaysTo(currentDate, 7 * period);
        }
        return result;
    }
}

export class DeleteGarbageCommand implements JamesCommand {
    commandString = "dg";
    description = "Mülldatum entfernen.";
    useExample = "/dg 14-3";

    async handleContext(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let date = parameters[0];
            const scanArgs = {
                FilterExpression: "#Type = :garbage and #Date = :date",
                ExpressionAttributeNames: {
                    "#Type": "event_type",
                    "#Date": "date"
                },
                ExpressionAttributeValues: {
                    ":garbage": "Garbage",
                    ":date": date
                }
            };

            let operationResult = await scanTable(scanArgs);
            let data = operationResult.data;
            let answer: string = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen..." + JSON.stringify(operationResult.error, null, 2)
                : "Am " + date + " sind " + data.Count + " Mülltermine gespeichert. Alle diese Termine werde ich löschen.";

            await logReply(ctx, answer);

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
    commandString = "dag";
    description = "Alle gespeicherten Mülldaten entfernen.";
    useExample = "/dag";

    async handleContext(ctx: CommandContext) {
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

        let operationResult = await scanTable(scanArgs);
        let data = operationResult.data;
        answer = operationResult.hasError
            ? "Oh nein, da ist was schiefgelaufen...: " + JSON.stringify(operationResult.error, null, 2)
            : "Ich habe " + data.Count + " Mülldaten gefunden. Alle diese Daten werde ich löschen.";
        await logReply(ctx, answer);

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
    commandString = "db";
    description = "Geburtstag entfernen.";
    useExample = "/db Hannah Meier 13-2";

    async handleContext(ctx: CommandContext) {
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

            let operationResult = await scanTable(scanArgs);
            let data = operationResult.data;
            answer = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen...: " + JSON.stringify(operationResult.error, null, 2)
                : "Die genannte Person (" + firstName + " " + secondName + ") ist " + data.Count + " mal gespeichert. Alle diese Daten werde ich löschen.";

            await logReply(ctx, answer);

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
    commandString = "snb";
    description = "Geburtstage in den nächsten n Tagen anzeigen.";
    useExample = "/snb 17";

    async handleContext(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let numberOfDays = parseInt(parameters[0]);
            let scanArgs = buildShowNextDatesScanArgs(numberOfDays, "Birthday");
            let operationResult = await scanTable(scanArgs);
            let data = operationResult.data;
            let answer = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen...: " + JSON.stringify(operationResult.error, null, 2)
                : this.buildAnswer(data, numberOfDays);
            await logReply(ctx, answer);
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
    commandString = "sng";
    description = "Mülldaten in den nächsten n Tagen anzeigen.";
    useExample = "/sng 14";

    async handleContext(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let numberOfDays = parseInt(parameters[0]);
            let scanArgs = buildShowNextDatesScanArgs(numberOfDays, "Garbage");
            let operationResult = await scanTable(scanArgs);
            let data = operationResult.data;
            let answer = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen...: " + JSON.stringify(operationResult.error, null, 2)
                : this.buildAnswer(data, numberOfDays);
            await logReply(ctx, answer);
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

export class ShowBirthdayForNameCommand implements JamesCommand {
    commandString = "sbfn";
    description = "Geburtsdatum einer bestimmten Person ausgeben.";
    useExample = "/sbfn John Doe";

    async handleContext(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let firstName = parameters[0];
            let lastName = parameters[1];
            let scanArgs = this.buildScanArgs(firstName, lastName, "Birthday");
            let operationResult = await scanTable(scanArgs);
            let data = operationResult.data;
            let answer = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen..." + JSON.stringify(operationResult.error, null, 2)
                : this.buildAnswer(data, firstName, lastName);
            await logReply(ctx, answer);
        }
    }

    buildAnswer(data, firstName: string, lastName: string) {
        if (data.Count > 0) {
            let date = "";
            data.Items.forEach(row => {
                date += row.date;
            })
            return firstName + " " + lastName + " hat am " + date + " Geburtstag. Wuff!"
        }
        return "Ich finde leider niemanden in meiner Datenbank, der so heißt :("
    }

    validateParameters(params: string[]): ValidationResult {
        let validationResult = new ValidationResult();
        if (params.length != 2) {
            validationResult.errorMessage = "Ich brauche zwei Parameter: Einen Vor- und einen Nachnamen.";
            validationResult.hasErrors = true;
        } else if (!isName(params[0]) || !isName(params[1])) {
            validationResult.errorMessage = "Hmm... Der Parameter sehen nicht richtig aus. Denk dran: Ich brauche einen Vornamen und einen Nachnamen.";
            validationResult.hasErrors = true;
        } else {
            validationResult.hasErrors = false;
        }
        return validationResult;
    }

    buildScanArgs(firstName: string, secondName: string, birthday: string) {
        return {
            FilterExpression: "#Type = :type and #FirstName = :firstName and #SecondName = :secondName",
            ExpressionAttributeNames: {
                "#FirstName": "first_name",
                "#SecondName": "second_name",
                "#Type": "event_type"
            },
            ExpressionAttributeValues: {
                ":firstName": firstName,
                ":secondName": secondName,
                ":type": birthday
            }
        }
    }
}

export class ShowNextGarbageForTypeCommand implements JamesCommand {
    commandString = "sgft";
    description = "Nächstes Datum für eine bestimmte Müllfarbe anzeigen.";
    useExample = "/sgft gelb";

    async handleContext(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let garbageType = normalizeGarbageType(parameters[0]);
            let scanArgs = this.buildScanArgs(garbageType, "Garbage");
            let operationResult = await scanTable(scanArgs);
            let data = operationResult.data;
            let answer = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen...: " + JSON.stringify(operationResult.error, null, 2)
                : this.buildAnswer(data, garbageType);
            await logReply(ctx, answer);
        }
    }

    buildAnswer(data, garbageType: string) {
        if (data.Count > 0) {
            let nearestDate = findNearestDate(data.Items);
            return "Der nächste Müll (" + garbageType + ") wird am " + nearestDate + " geholt. Wuff!"
        }
        return "Ich finde keinen solchen Mülleintrag in meiner Datenbank :("
    }

    validateParameters(params: string[]): ValidationResult {
        let validationResult = new ValidationResult();
        if (params.length != 1) {
            validationResult.errorMessage = "Ich brauche einen Parameter: Eine Müllfarbe.";
            validationResult.hasErrors = true;
        } else if (!isGarbageType(params[0])) {
            validationResult.errorMessage = "Hmm... Der Parameter sieht nicht richtig aus. Denk dran: Ich brauche eine Müllfarbe.";
            validationResult.hasErrors = true;
        } else {
            validationResult.hasErrors = false;
        }
        return validationResult;
    }

    buildScanArgs(garbageType: string, birthday: string) {
        return {
            FilterExpression: "#Type = :type and #GarbageType = :garbageType",
            ExpressionAttributeNames: {
                "#GarbageType": "garbage_type",
                "#Type": "event_type"
            },
            ExpressionAttributeValues: {
                ":garbageType": garbageType,
                ":type": birthday
            }
        }
    }
}

export class ShowBirthdaysForMonthCommand implements JamesCommand {
    commandString = "sbfm";
    description = "Alle Geburtsdaten in einem bestimmten Monat anzeigen (default ist der jetzige Monat).";
    useExample = "/sbfm Januar";

    async handleContext(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let monthName;
            let monthNumber;
            if (parameters[0] != null) {
                monthName = normalizeMonthName(parameters[0]);
                monthNumber = monthNameToNumber(monthName);
            } else {
                monthName = "diesen Monat";
                monthNumber = (new Date()).getMonth() + 1;
            }
            let scanArgs = buildShowMonthDatesScanArgs(monthNumber, "Birthday");
            let operationResult = await scanTable(scanArgs);
            let data = operationResult.data;
            let logMessage = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen...: " + JSON.stringify(operationResult.error, null, 2)
                : this.buildAnswer(data, monthName);
            await logReply(ctx, logMessage);
        }
    }

    buildAnswer(data, monthName: string) {
        let message = "Folgende Geburtstage gibt es für " + monthName + ":\n";
        data.Items.forEach(row => {
            message += row.first_name + " " + row.second_name + " am " + row.date + "\n";
        })
        return message;
    }

    validateParameters(params: string[]): ValidationResult {
        let validationResult = new ValidationResult();
        if (params.length > 1) {
            validationResult.errorMessage = "Ich brauche maximal einen Parameter: Einen Monat.";
            validationResult.hasErrors = true;
        } else if (params[0] != null && !isMonthName(params[0])) {
            validationResult.errorMessage = "Hmm... Der Parameter sieht nicht richtig aus. Denk dran: Ich brauche einen Monat.";
            validationResult.hasErrors = true;
        } else {
            validationResult.hasErrors = false;
        }
        return validationResult;
    }
}

export class ShowGarbagesForMonthCommand implements JamesCommand {
    commandString = "sgfm";
    description = "Mülldaten für Monat anzeigen (default ist der jetzige Monat).";
    useExample = "/sgfm Juni";

    async handleContext(ctx: CommandContext) {
        let parameters = getCommandParameters(ctx);
        let validationResult = this.validateParameters(parameters);
        if (validationResult.hasErrors) {
            await ctx.reply(validationResult.errorMessage);
        } else {
            let monthName;
            let monthNumber;
            if (parameters[0] != null) {
                monthName = normalizeMonthName(parameters[0]);
                monthNumber = monthNameToNumber(monthName);
            } else {
                monthName = "diesen Monat";
                monthNumber = (new Date()).getMonth() + 1;
            }
            let scanArgs = buildShowMonthDatesScanArgs(monthNumber, "Garbage");
            let operationResult = await scanTable(scanArgs);
            let data = operationResult.data;
            let logMessage: string = operationResult.hasError
                ? "Oh nein, da ist was schiefgelaufen...: " + JSON.stringify(operationResult.error, null, 2)
                : this.buildAnswer(data, monthName);
            await logReply(ctx, logMessage);
        }
    }

    buildAnswer(data, monthName: string) {
        let message = "Folgende Mülldaten gibt es für " + monthName + ":\n";
        data.Items.forEach(row => {
            message += getGarbageDescription(normalizeGarbageType(row.garbage_type)) + " am " + row.date + "\n";
        })
        return message;
    }

    validateParameters(params: string[]): ValidationResult {
        let validationResult = new ValidationResult();
        if (params.length > 1) {
            validationResult.errorMessage = "Ich brauche maximal einen Parameter: Einen Monat.";
            validationResult.hasErrors = true;
        } else if (params[0] != null && !isMonthName(params[0])) {
            validationResult.errorMessage = "Hmm... Der Parameter sieht nicht richtig aus. Denk dran: Ich brauche einen Monat.";
            validationResult.hasErrors = true;
        } else {
            validationResult.hasErrors = false;
        }
        return validationResult;
    }
}


