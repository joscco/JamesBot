import {Telegraf} from "telegraf";
import * as commands from "./commands";

const botToken = process.env.BOT_TOKEN;

if (botToken === undefined) {
    throw Error("BOT_TOKEN must be defined!");
}

const bot = new Telegraf(botToken, {
    telegram: {
        webhookReply: true
    }
});

// Allgemeine Befehle
bot.start((ctx) => ctx.reply("Hi, ich bin JamesBot! Hast du neue Daten für mich?"));
bot.hears(/^(hey|hi)$/i, (ctx) => ctx.reply("Hey!"));
bot.hears(/^Wer hat die Kokosnuss geklaut[?]*$/i, (ctx) => ctx.reply("Du, du Schlingel... 😏"));
bot.help(ctx => ctx.reply(commands.generateHelpText()));
bot.on('sticker', ctx => ctx.reply("😅"));

// Spezielle Befehle, Datenbank Schreiben
bot.command("AddBirthday", commands.addBirthday);
bot.command("AddGarbage", commands.addGarbage)
bot.command("DeleteBirthday", commands.deleteBirthday);
bot.command("DeleteGarbage", commands.deleteGarbage);
bot.command("DeleteAllGarbage", commands.deleteAllGarbage);

// Spezielle Befehle, Datenbank Auslesen
bot.command("BirthdaysNextDays", commands.showNextBirthdays);
bot.command("GarbageNextDays", commands.showNextGarbages);
bot.command("BirthdayForName", commands.showSpecificBirthday);
bot.command("NextGarbageForType", commands.showNextSpecificGarbage);
bot.command("BirthdaysThisMonth", commands.showBirthdaysThisMonth);
bot.command("GarbagesThisMonth", commands.showGarbagesThisMonth);
bot.command("BirthdaysForMonth", commands.showBirthdaysForMonth);
bot.command("GarbagesForMonth", commands.showGarbagesForMonth);


// Hier muss die webhook-Option eingefügt werden, sonst wird der Webhook immer wieder auf null gesetzt!

// Main Lambda function
exports.mainHandler = async function (event) {
    try {
        await bot.launch({
            webhook: {
                domain: process.env.BOT_WEBHOOK_DOMAIN,
                hookPath: process.env.BOT_WEBHOOK_PATH
            }
        });
        // process event data
        const body = event.body;
        console.log("Event stringly: " + JSON.stringify(event));
        // Body kommt als json Objekt rein, muss nicht geparsed werden.
        await bot.handleUpdate(body);
    } catch (err) {
        console.log("Upps, ein Fehler ist aufgetreten: " + err)
    }
}

// Lambda function for daily birthday reminders
exports.birthdayTriggerHandler = async function () {
    try {
        console.log("Führe Birthday Reminder aus.");
        await commands.sendDailyBirthdayReminder(bot);
        console.log("Birthday Reminder ausgeführt.");
    } catch (err) {
        console.log("Upps, ein Fehler ist aufgetreten: " + err)
    }
}

// Lambda function for daily garbage reminders
exports.garbageTriggerHandler = async function () {
    try {
        console.log("Führe Garbage Reminder aus.");
        await commands.sendDailyGarbageReminder(bot);
        console.log("Garbage Reminder ausgeführt.");
    } catch (err) {
        console.log("Upps, ein Fehler ist aufgetreten: " + err)
    }

}