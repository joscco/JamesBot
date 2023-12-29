import {James} from "./James";
import {BirthdayReminder} from "./Reminders/BirthdayReminder";
import {JamesTaskRepo} from "./infrastructure/JamesTaskRepo";
import {GarbageReminder} from "./Reminders/GarbageReminder";

const jamesRepo = new JamesTaskRepo()
const james = new James(jamesRepo)

// Hier muss die webhook-Option eingefügt werden, sonst wird der Webhook immer wieder auf null gesetzt!
// Main Lambda function
exports.mainHandler = async function (event) {
    try {
        await james.bot.launch({
            webhook: {
                domain: process.env.BOT_WEBHOOK_DOMAIN,
                hookPath: process.env.BOT_WEBHOOK_PATH
            }
        });
        // process event data
        const body = event.body;
        console.log("Event stringly: " + JSON.stringify(event));
        // Body kommt als json Objekt rein, muss nicht geparsed werden.
        await james.bot.handleUpdate(body);
    } catch (err) {
        console.log("Upps, ein Fehler ist aufgetreten: " + err)
    }
}

// Lambda function for daily birthday reminders
exports.birthdayTriggerHandler = async function () {
    try {
        console.log("Führe Birthday Reminder aus.");
        await new BirthdayReminder(jamesRepo).sendDailyBirthdayReminder(james.bot);
        console.log("Birthday Reminder ausgeführt.");
    } catch (err) {
        console.log("Upps, ein Fehler ist aufgetreten: " + err)
    }
}

// Lambda function for daily garbage reminders
exports.garbageTriggerHandler = async function () {
    try {
        console.log("Führe Garbage Reminder aus.");
        await new GarbageReminder(jamesRepo).sendDailyGarbageReminder(james.bot);
        console.log("Garbage Reminder ausgeführt.");
    } catch (err) {
        console.log("Upps, ein Fehler ist aufgetreten: " + err)
    }
}