import {WizardScene} from "telegraf/typings/scenes";
import {Scenes} from "telegraf";
import {JamesContextWithSession} from "../index";
import {ConverterUtils, GarbageType, Month} from "../ConverterUtils";
import {KeyboardUtils} from "../KeyboardUtils";
import {JamesTaskRepo} from "../infrastructure/JamesTaskRepo";

export interface AddPeriodicGarbageWizardSession extends Scenes.WizardSessionData {
    garbageColor: string;
    startDay: number;
    startMonth: Month;
    periodInDays: number;
}

export class AddPeriodicGarbage {

    jamesRepo: JamesTaskRepo
    wizard: WizardScene<JamesContextWithSession<AddPeriodicGarbageWizardSession>>

    constructor(jamesRepo: JamesTaskRepo) {
        this.jamesRepo = jamesRepo
        this.wizard = new Scenes.WizardScene<JamesContextWithSession<AddPeriodicGarbageWizardSession>>(
            this.getId(),
            async ctx => {
                await ctx.reply(
                    "Für welche Müllfarbe möchtest du ein periodisches Mülldatum hinzufügen?",
                    KeyboardUtils.createGarbageColorKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                ctx.scene.session.garbageColor = ctx.message["text"]
                await ctx.reply(
                    "In welchem Monat findet der erste Mülltermin statt?",
                    KeyboardUtils.createMonthKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                ctx.scene.session.startMonth = ctx.message["text"]
                await ctx.reply("Und an welchem Tag findet der erste Mülltermin statt?",
                    KeyboardUtils.createDayOfMonthKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                ctx.scene.session.startDay = parseInt(ctx.message["text"])
                await ctx.reply("In welchem Tagesabstand finden die Mülltermine statt?",
                    KeyboardUtils.createGarbagePeriodKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                let garbageType = ctx.scene.session.garbageColor as GarbageType
                let month = ctx.scene.session.startMonth
                let day = ctx.scene.session.startDay
                let period = ctx.message["text"]

                let garbageDates = this.createGarbageDates(month, day, period);
                for (let [periodicDay, periodicMonth] of garbageDates) {
                    await this.jamesRepo.addGarbage(garbageType, periodicDay, periodicMonth)
                }
                await ctx.reply("Ich habe folgende Mülldaten hinzugefügt: " + garbageDates);
                return await ctx.scene.leave();
            })

        this.wizard.hears('Abbrechen', ctx => ctx.scene.leave())
    }

    createGarbageDates(startMonth: Month, startDay: number, period: number): [number, Month][] {
        let startDate = ConverterUtils.dateToString(startDay, startMonth);
        let numberOfDates = ConverterUtils.subtract("31-12", startDate) / period;
        let currentDate: string = startDate
        let result = [];
        for (let i = 0; i < numberOfDates; i++) {
            let [day, month] = currentDate.split("-").map(s => parseInt(s))
            result.push([day, ConverterUtils.numberToMonthName(month)]);
            currentDate = ConverterUtils.addDaysTo(currentDate, period);
        }
        return result;
    }

    getId(): string {
        return "AddPeriodicGarbage"
    }

    getOptionTitle(): string {
        return "Periodisches Mülldatum hinzufügen";
    }

    getWizard(): WizardScene<JamesContextWithSession<AddPeriodicGarbageWizardSession>> {
        return this.wizard
    }
}