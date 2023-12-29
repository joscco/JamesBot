import {WizardScene} from "telegraf/typings/scenes";
import {Scenes} from "telegraf";
import {JamesDataBaseItem} from "../infrastructure/AWSClient";
import {KeyboardUtils} from "../KeyboardUtils";
import {JamesTaskRepo} from "../infrastructure/JamesTaskRepo";
import {JamesContextWithSession} from "../James";

export interface DeleteAllGarbagesWizardSession extends Scenes.WizardSessionData {
    events: JamesDataBaseItem[]
}

export class DeleteAllGarbages {

    jamesRepo: JamesTaskRepo
    wizard: WizardScene<JamesContextWithSession<DeleteAllGarbagesWizardSession>>

    constructor(jamesRepo: JamesTaskRepo) {

        this.jamesRepo = jamesRepo
        this.wizard = new Scenes.WizardScene<JamesContextWithSession<DeleteAllGarbagesWizardSession>>(
            this.getId(),
            async ctx => {
                let events = await this.jamesRepo.getAllGarbages()

                if (events.length === 0) {
                    await ctx.reply("Es gibt nichts zu löschen.");
                    return await ctx.scene.leave();
                }

                ctx.scene.session.events = events
                await ctx.reply("Bist du sicher, dass du alle " + events.length + " Mülldaten löschen möchtest?",
                    KeyboardUtils.createConfirmKeyboard());
                return ctx.wizard.next();
            },
            async ctx => {
                for (const row of ctx.scene.session.events) {
                    try {
                        await this.jamesRepo.deleteEvent(row.event_id);
                        await ctx.reply("Mülldatum am " + row.date + " gelöscht.");
                    } catch (err) {
                        await ctx.reply("Beim Löschen ist etwas fehlgeschlagen. Error: " + err);
                    }
                }
                return await ctx.scene.leave();
            })

        this.wizard.hears('Abbrechen', ctx => ctx.scene.leave())
    }

    getId(): string {
        return "DeleteAllGarbages"
    }

    getOptionTitle(): string {
        return "Alle Mülldaten löschen";
    }

    getWizard(): WizardScene<JamesContextWithSession<DeleteAllGarbagesWizardSession>> {
        return this.wizard
    }
}