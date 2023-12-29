import {WizardScene} from "telegraf/typings/scenes";
import {Markup, Scenes} from "telegraf";
import {JamesDataBaseItem} from "../infrastructure/AWSClient";
import {KeyboardUtils} from "../KeyboardUtils";
import {JamesTaskRepo} from "../infrastructure/JamesTaskRepo";
import {JamesContextWithSession} from "../James";

export interface DeleteBirthdayWizardSession extends Scenes.WizardSessionData {
    events: JamesDataBaseItem[]
    eventIdToDelete: string,
    selectedIndex: number
}

export class DeleteBirthday {
    jamesRepo: JamesTaskRepo
    wizard: WizardScene<JamesContextWithSession<DeleteBirthdayWizardSession>>

    constructor(jamesRepo: JamesTaskRepo) {
        this.jamesRepo = jamesRepo
        this.wizard = new Scenes.WizardScene<JamesContextWithSession<DeleteBirthdayWizardSession>>(
            this.getId(),
            async ctx => {
                let result = await jamesRepo.getAllBirthdays()
                ctx.scene.session.events = result
                await ctx.reply("Folgende Geburtstage habe ich gespeichert, welchen möchtest du löschen?",
                    Markup.keyboard(
                        result.map((item, index) => [
                            Markup.button.text((index + 1) + ": " + item.first_name + " " + item.second_name + " am " + item.date)
                        ])
                    ));
                return ctx.wizard.next();
            },
            async ctx => {
                let [selectedIndex, _] = ctx.message["text"].split(":")
                ctx.scene.session.selectedIndex = selectedIndex - 1
                let birthdayData = ctx.scene.session.events[selectedIndex - 1]
                ctx.scene.session.eventIdToDelete = birthdayData.event_id

                await ctx.reply(
                    "Sicher das du folgenden Geburtstag löschen willst: " + birthdayData.first_name + " " + birthdayData.second_name + " am " + birthdayData.date + "?",
                    KeyboardUtils.createConfirmKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                let operationResult = await this.jamesRepo.deleteEvent(ctx.scene.session.eventIdToDelete)
                let birthdayData = ctx.scene.session.events[ctx.scene.session.selectedIndex]
                let logMessage = operationResult.hasError
                    ? "Oh nein, da ist was schiefgelaufen..." + JSON.stringify(operationResult.error, null, 2)
                    : "Ich habe den Geburtstag von " + birthdayData.garbage_type + " am " + birthdayData.date + " gelöscht";

                await ctx.reply(logMessage);
                return await ctx.scene.leave();
            })

        this.wizard.hears('Abbrechen', ctx => ctx.scene.leave())
    }

    getId(): string {
        return "DeleteBirthday"
    }

    getOptionTitle(): string {
        return "Geburtstag entfernen";
    }

    getWizard(): WizardScene<JamesContextWithSession<DeleteBirthdayWizardSession>> {
        return this.wizard
    }
}