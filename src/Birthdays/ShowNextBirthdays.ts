import {WizardScene, WizardSessionData} from "telegraf/typings/scenes";
import {Scenes} from "telegraf";
import {ConverterUtils} from "../ConverterUtils";
import {KeyboardUtils} from "../KeyboardUtils";
import {JamesTaskRepo} from "../infrastructure/JamesTaskRepo";
import {JamesDataBaseItem} from "../infrastructure/AWSClient";
import {JamesContextWithSession} from "../James";

export class ShowNextBirthdays {

    jamesRepo: JamesTaskRepo
    wizard: WizardScene<JamesContextWithSession<WizardSessionData>>

    constructor(jamesRepo: JamesTaskRepo) {

        this.jamesRepo = jamesRepo
        this.wizard = new Scenes.WizardScene<JamesContextWithSession<WizardSessionData>>(
            this.getId(),
            async ctx => {
                await ctx.reply(
                    "Für wie viele Tage willst du die Geburtstage angezeigt bekommen?",
                    KeyboardUtils.createExpNumberKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                let numberOfDays = parseInt(ctx.message["text"])
                let items = await jamesRepo.getAllBirthdays()
                let today = ConverterUtils.getToday()
                let filteredItems = items.filter(item => {
                    let [day, monthAsNum] = (item.date as string).split("-").map(s => parseInt(s))
                    let month = ConverterUtils.numberToMonthName(monthAsNum)
                    let distance = ConverterUtils.dateDistance(day, month, today.day, today.month)
                    return distance >= 0 && distance <= numberOfDays
                })

                let answer = this.buildAnswer(filteredItems, numberOfDays);
                await ctx.reply(answer);
                return await ctx.scene.leave();
            })

        this.wizard.hears('Abbrechen', ctx => ctx.scene.leave())
    }

    buildAnswer(data: JamesDataBaseItem[], numberOfDays: number): string {
        let message = "Folgende Personen haben in den nächsten " + numberOfDays + " Tagen Geburstag:\n\n";
        data.forEach(row => {
            message += row.first_name + " " + row.second_name + " am " + row.date + "\n";
        })
        return message;
    }


    getId(): string {
        return "ShowNextBirthdays"
    }

    getOptionTitle(): string {
        return "Geburtstage anzeigen";
    }

    getWizard(): WizardScene<JamesContextWithSession<WizardSessionData>> {
        return this.wizard
    }
}