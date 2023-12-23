import {WizardScene} from "telegraf/typings/scenes";
import {Markup, Scenes} from "telegraf";
import {JamesContextWithSession} from "../index";
import {KeyboardUtils} from "../KeyboardUtils";
import {JamesTaskRepo} from "../infrastructure/JamesTaskRepo";
import {JamesDataBaseItem} from "../infrastructure/AWSClient";

export interface DeleteGarbageWizardSession extends Scenes.WizardSessionData {
    events: JamesDataBaseItem[]
    eventIdToDelete: string,
    selectedIndex: number
}

export class DeleteGarbage {
    jamesRepo: JamesTaskRepo
    wizard: WizardScene<JamesContextWithSession<DeleteGarbageWizardSession>>

    constructor(jamesRepo: JamesTaskRepo) {
        this.jamesRepo = jamesRepo
        this.wizard = new Scenes.WizardScene<JamesContextWithSession<DeleteGarbageWizardSession>>(
            this.getId(),
            async ctx => {
                let result = await jamesRepo.getAllGarbages()
                ctx.scene.session.events = result
                await ctx.reply("Folgende Mülldaten habe ich gespeichert, welches möchtest du löschen?",
                    Markup.keyboard(
                        result.map((item, index) => [
                            Markup.button.text((index + 1) + ": " + item.garbage_type + " am " + item.date)
                        ])
                    ));
                return ctx.wizard.next();
            },
            async ctx => {
                let [selectedIndex, _] = ctx.message["text"].split(":")
                ctx.scene.session.selectedIndex = selectedIndex - 1
                let garbageData = ctx.scene.session.events[selectedIndex - 1]
                ctx.scene.session.eventIdToDelete = garbageData.event_id

                await ctx.reply("Sicher das du folgendes Mülldatum löschen willst: " + garbageData.garbage_type + " am " + garbageData.date + "?", KeyboardUtils.createConfirmKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                let operationResult = await this.jamesRepo.deleteEvent(ctx.scene.session.eventIdToDelete)
                let garbageData = ctx.scene.session.events[ctx.scene.session.selectedIndex]
                let logMessage = operationResult.hasError
                    ? "Oh nein, da ist was schiefgelaufen..." + JSON.stringify(operationResult.error, null, 2)
                    : "Ich habe das Mülldatum " + garbageData.garbage_type + " am " + garbageData.date + " gelöscht";

                await ctx.reply(logMessage);
                return await ctx.scene.leave();
            })

        this.wizard.hears('Abbrechen', ctx => ctx.scene.leave())
    }

    getId(): string {
        return "DeleteGarbage"
    }

    getOptionTitle(): string {
        return "Mülldatum löschen";
    }

    getWizard(): WizardScene<JamesContextWithSession<DeleteGarbageWizardSession>> {
        return this.wizard
    }
}