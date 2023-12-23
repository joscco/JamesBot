import {WizardScene} from "telegraf/typings/scenes";
import {Scenes} from "telegraf";
import {JamesContextWithSession} from "../index";
import {ConverterUtils, Month} from "../ConverterUtils";
import {KeyboardUtils} from "../KeyboardUtils";
import {JamesTaskRepo} from "../infrastructure/JamesTaskRepo";

export interface AddBirthdayWizardSession extends Scenes.WizardSessionData {
    firstName: string;
    secondName: string;
    day: string;
    month: string;
}

export class AddBirthday {

    jamesRepo: JamesTaskRepo
    wizard: WizardScene<JamesContextWithSession<AddBirthdayWizardSession>>

    constructor(jamesRepo: JamesTaskRepo) {

        this.jamesRepo = jamesRepo
        this.wizard = new Scenes.WizardScene<JamesContextWithSession<AddBirthdayWizardSession>>(
            this.getId(),
            async ctx => {
                await ctx.reply("Wie heißt die Person, deren Geburstag du hinzufügen möchtest?");
                return ctx.wizard.next();
            },
            async ctx => {
                let names = ctx.message["text"].split(" ")
                ctx.scene.session.firstName = names[0]
                ctx.scene.session.secondName = names.slice(1).join(" ")
                await ctx.reply("In welchem Monat hat sie Geburtstag?", KeyboardUtils.createMonthKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                ctx.scene.session.month = ctx.message["text"]
                await ctx.reply("Und an welchem Tag?", KeyboardUtils.createDayOfMonthKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                let firstName = ConverterUtils.capitalizeFirstLetter(ctx.scene.session.firstName)
                let secondName = ConverterUtils.capitalizeFirstLetter(ctx.scene.session.secondName)
                let month = ctx.scene.session.month as Month
                let day = ctx.message["text"]
                let birthdayDate = day + ". " + month

                let isDuplicate = await this.jamesRepo.birthdayExists(firstName, secondName, day, month)
                let logMessage: string
                if (isDuplicate) {
                    logMessage = "Danke, aber diesen Eintrag habe ich bereits. Versuch's nochmal :)";
                } else {
                    console.log("Füge Geburstag von " + firstName + " " + secondName + " am " + birthdayDate + " hinzu.");
                    let operationResult = await this.jamesRepo.addBirthday(firstName, secondName, day, month)
                    logMessage = operationResult.hasError
                        ? "Oh nein, da ist was schiefgelaufen..." + JSON.stringify(operationResult.error, null, 2)
                        : "Ich habe den Geburstag von " + firstName + " " + secondName + " am " + birthdayDate + " hinzugefügt";
                }
                await ctx.reply(logMessage);
                return await ctx.scene.leave();
            })

        this.wizard.hears('Abbrechen', ctx => ctx.scene.leave())
    }

    getId(): string {
        return "AddBirthday"
    }

    getOptionTitle(): string {
        return "Geburtstag hinzufügen";
    }

    getWizard(): WizardScene<JamesContextWithSession<AddBirthdayWizardSession>> {
        return this.wizard
    }
}