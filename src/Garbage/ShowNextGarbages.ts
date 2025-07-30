import {WizardScene, WizardSessionData} from "telegraf/typings/scenes";
import {Scenes} from "telegraf";
import {JamesDataBaseItem} from "../infrastructure/AWSClient";
import {ConverterUtils} from "../ConverterUtils";
import {KeyboardUtils} from "../KeyboardUtils";
import {JamesTaskRepo} from "../infrastructure/JamesTaskRepo";
import {JamesContextWithSession} from "../James";

export class ShowNextGarbages {

    jamesRepo: JamesTaskRepo
    wizard: WizardScene<JamesContextWithSession<WizardSessionData>>

    constructor(jamesRepo: JamesTaskRepo) {

        this.jamesRepo = jamesRepo
        this.wizard = new Scenes.WizardScene<JamesContextWithSession<WizardSessionData>>(
            this.getId(),
            async ctx => {
                await ctx.reply(
                    "Für wie viele Tage willst du die Mülldaten angezeigt bekommen?",
                    KeyboardUtils.createExpNumberKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                let numberOfDays = parseInt(ctx.message["text"])
                let items = await jamesRepo.getAllGarbages()
                let today = ConverterUtils.getToday()
                let filteredItems = items.filter(item => {
                    let [day, monthAsNum] = (item.date as string).split("-").map(s => parseInt(s))
                    let month = ConverterUtils.numberToMonthName(monthAsNum)
                    let distance = ConverterUtils.dateDistance(day, month, today.day, today.month)
                    return distance <= numberOfDays
                })

                let answer = this.buildAnswer(filteredItems, numberOfDays);
                await ctx.reply(answer);
                return await ctx.scene.leave();
            })

        this.wizard.hears('Abbrechen', ctx => ctx.scene.leave())
    }

    buildAnswer(data: JamesDataBaseItem[], numberOfDays: number) {
        let message = "Folgende Mülldaten gibt es in den nächsten " + numberOfDays + " Tagen:\n\n";
        data.forEach(row => {
            message += ConverterUtils.getGarbageDescription(row.garbage_type as string)
                + " " + ConverterUtils.getGarbageEmoji(row.garbage_type as string)
                + " am " + row.date + "\n";
        })
        return message;
    }


    getId(): string {
        return "ShowNextGarbages"
    }

    getOptionTitle(): string {
        return "Mülldaten anzeigen";
    }

    getWizard(): WizardScene<JamesContextWithSession<WizardSessionData>> {
        return this.wizard
    }
}