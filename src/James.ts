import {Context, Markup, Scenes, session, Telegraf} from "telegraf";
import {JamesTaskRepo} from "./infrastructure/JamesTaskRepo";
import {ShowNextGarbages} from "./Garbage/ShowNextGarbages";
import {ShowNextBirthdays} from "./Birthdays/ShowNextBirthdays";
import {DeleteGarbage} from "./Garbage/DeleteGarbage";
import {DeleteBirthday} from "./Birthdays/DeleteBirthday";
import {AddPeriodicGarbage} from "./Garbage/AddPeriodicGarbage";
import {IdChecker} from "./IdChecker";
import {DeleteAllGarbages} from "./Garbage/DeleteAllGarbages";
import {AddGarbage} from "./Garbage/AddGarbage";
import {AddBirthday} from "./Birthdays/AddBirthday";

export interface JamesContext extends Context {
    scene: Scenes.SceneContextScene<JamesContext, Scenes.WizardSessionData>;
}

export interface JamesContextWithSession<T extends Scenes.WizardSessionData> extends JamesContext {
    session: Scenes.WizardSession<T>;
    scene: Scenes.SceneContextScene<JamesContextWithSession<T>, T>;
    wizard: Scenes.WizardContextWizard<JamesContextWithSession<T>>;
}

export class James {
    jamesRepo: JamesTaskRepo
    bot: Telegraf<JamesContext>;
    constructor(jamesRepo: JamesTaskRepo) {

        this.jamesRepo = jamesRepo
        const botToken = process.env.BOT_TOKEN;

        if (botToken === undefined) {
            throw Error("BOT_TOKEN must be defined!");
        }

        const garbageSubScenes = [
            new AddGarbage(jamesRepo),
            new AddPeriodicGarbage(jamesRepo),
            new ShowNextGarbages(jamesRepo),
            new DeleteGarbage(jamesRepo),
            new DeleteAllGarbages(jamesRepo)
        ]
        const garbageScene = new Scenes.BaseScene<JamesContext>('GARBAGE_SCENE')
        garbageScene.enter(Telegraf.reply('Müll also. Was willst du tun?',
            Markup.keyboard([
                ...garbageSubScenes.map(scene => [scene.getOptionTitle()]),
                ["Abbrechen"]
            ])
                .oneTime()
                .resize())
        );

        for (let garbageCommand of garbageSubScenes) {
            garbageScene.hears(
                garbageCommand.getOptionTitle(),
                ctx => ctx.scene.enter(garbageCommand.getId()))
        }

        const birthdaySubScenes = [
            new AddBirthday(jamesRepo),
            new ShowNextBirthdays(jamesRepo),
            new DeleteBirthday(jamesRepo)
        ]

        const birthdayScene = new Scenes.BaseScene<JamesContext>('BIRTHDAY_SCENE')
        birthdayScene.enter(Telegraf.reply('Geburtstage also. Was willst du tun?',
            Markup.keyboard([
                ...birthdaySubScenes.map(scene => [scene.getOptionTitle()]),
                ["Abbrechen"]
            ])
                .oneTime()
                .resize())
        );
        for (let birthdayCommand of birthdaySubScenes) {
            birthdayScene.hears(
                birthdayCommand.getOptionTitle(),
                ctx => ctx.scene.enter(birthdayCommand.getId()))
        }

        const bot = new Telegraf<JamesContext>(botToken, {
            telegram: {
                webhookReply: true
            }
        });

        const stage = new Scenes.Stage<JamesContext>([
            birthdayScene,
            garbageScene,
            ...birthdaySubScenes.map(scene => scene.getWizard()),
            ...garbageSubScenes.map(scene => scene.getWizard())
        ], {})

        bot.use(session())
        bot.use(stage.middleware())

        bot.hears('Müll', ctx => {
            if (IdChecker.isValidID(ctx.message.from.id.toString())) {
                return ctx.scene.enter('GARBAGE_SCENE')
            } else {
                ctx.reply("Dir gehorche ich nicht.");
            }
        });

        bot.hears('Geburtstage', ctx => {
            if (IdChecker.isValidID(ctx.message.from.id.toString())) {
                return ctx.scene.enter('BIRTHDAY_SCENE')
            } else {
                ctx.reply("Dir gehorche ich nicht.");
            }
        });
        bot.hears('Abbrechen', ctx => ctx.scene.leave())

        bot.on('message', Telegraf.reply("Womit kann ich helfen?",
            Markup.keyboard([
                ["Müll"],
                ["Geburtstage"],
                ["Abbrechen"]
            ])
                .oneTime()
                .resize())
        )

        this.bot = bot
    }
}