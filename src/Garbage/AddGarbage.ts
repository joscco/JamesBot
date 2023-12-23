import {WizardScene} from "telegraf/typings/scenes";
import {Scenes} from "telegraf";
import {JamesContextWithSession} from "../index";
import {ConverterUtils, GarbageType, Month} from "../ConverterUtils";
import {KeyboardUtils} from "../KeyboardUtils";
import {JamesTaskRepo} from "../infrastructure/JamesTaskRepo";

export interface AddGarbageWizardSession extends Scenes.WizardSessionData {
    garbageColor: string;
    day: string;
    month: string;
}

export class AddGarbage {

    jamesRepo: JamesTaskRepo
    wizard: WizardScene<JamesContextWithSession<AddGarbageWizardSession>>

    constructor(jamesRepo: JamesTaskRepo) {
        this.jamesRepo = jamesRepo
        this.wizard = new Scenes.WizardScene<JamesContextWithSession<AddGarbageWizardSession>>(
            this.getId(),
            async ctx => {
                await ctx.reply(
                    "Für welche Müllfarbe möchtest du ein Mülldatum hinzufügen?",
                    KeyboardUtils.createGarbageColorKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                ctx.scene.session.garbageColor = ctx.message["text"]
                await ctx.reply(
                    "In welchem Monat?",
                    KeyboardUtils.createMonthKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                ctx.scene.session.month = ctx.message["text"]
                await ctx.reply("Und an welchem Tag?",
                    KeyboardUtils.createDayOfMonthKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                let garbageType = ctx.scene.session.garbageColor as GarbageType
                let month = ctx.scene.session.month as Month
                let day = parseInt(ctx.message["text"])
                let garbageDate = ConverterUtils.createDate(month, day)
                let isDuplicate = await this.jamesRepo.garbageDateExists(garbageType, day, month);

                let logMessage: string;

                if (isDuplicate) {
                    logMessage = "Danke, aber diesen Eintrag habe ich bereits. Versuch's nochmal :)";
                } else {
                    await ctx.reply("Füge Müll (" + garbageType + ") am " + garbageDate + " hinzu.");
                    let operationResult = await this.jamesRepo.addGarbage(garbageType, day, month)
                    logMessage = operationResult.hasError
                        ? "Oh nein, da ist was schiefgelaufen..." + JSON.stringify(operationResult.error, null, 2)
                        : "Ich einen Mülltermin (" + garbageType + ") am " + garbageDate + " hinzugefügt";
                }
                await ctx.reply(logMessage);
                return await ctx.scene.leave();
            })

        this.wizard.hears('Abbrechen', ctx => ctx.scene.leave())
    }

    getId(): string {
        return "AddGarbage"
    }

    getOptionTitle(): string {
        return "Mülldatum hinzufügen";
    }

    getWizard(): WizardScene<JamesContextWithSession<AddGarbageWizardSession>> {
        return this.wizard
    }
}