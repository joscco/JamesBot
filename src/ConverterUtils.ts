export type Month = "Januar" | "Februar" | "März"
    | "April" | "Mai" | "Juni"
    | "Juli" | "August" | "September"
    | "Oktober" | "November" | "Dezember"

export type GarbageType = "Schwarz" | "Gelb" | "Grün" | "Braun"

const MONTHS: Month[] = ["Januar", "Februar", "März", "April",
    "Mai", "Juni", "Juli", "August",
    "September", "Oktober", "November", "Dezember"]

export class ConverterUtils {

    static getToday() {
        let today = new Date();
        return {day: today.getDate(), month: this.numberToMonthName(today.getMonth() + 1)}
    }

    static getTomorrow() {
        let date = new Date();
        date.setDate(date.getDate() + 1);
        return {day: date.getDate(), month: this.numberToMonthName(date.getMonth() + 1)}
    }

    static capitalizeFirstLetter(input: string): string {
        return input.charAt(0).toUpperCase() + input.slice(1);
    }

    static monthNameToNumber(monthName: Month): number {
        return MONTHS.indexOf(monthName) + 1
    }

    static numberToMonthName(num: number): Month {
        return MONTHS[num - 1]
    }

    static getGarbageDescription(type: string) {
        if (type === "Schwarz") {
            return "Hausmüll"
        } else if (type === "Grün") {
            return "Papier"
        } else if (type === "Braun") {
            return "Gartenabfall"
        } else if (type === "Gelb") {
            return "Plastik"
        } else {
            return type;
        }
    }

    static getGarbageEmoji(type: string) {
        if (type === "Schwarz") {
            return "⚫️"
        } else if (type === "Grün") {
            return "🟢"
        } else if (type === "Braun") {
            return "🟤"
        } else if (type === "Gelb") {
            return "🟡"
        } else {
            return "";
        }
    }

    static subtract(date1: string, date2: string): number {
        let distance = this.rareSubtract(date1, date2);
        if (distance <= 0) {
            return 365 - distance;
        } else return distance;
    }

    static rareSubtract(date1: string, date2: string): number {
        let date1Tokens = date1.split("-");
        let date2Tokens = date2.split("-");
        let day1 = parseInt(date1Tokens[0]);
        let month1 = parseInt(date1Tokens[1]);
        let day2 = parseInt(date2Tokens[0]);
        let month2 = parseInt(date2Tokens[1]);

        return (month1 - month2) * 30 + (day1 - day2);
    }

    static dateSubtract(dayTo: number, monthTo: Month, dayFrom: number, monthFrom: Month): number {
        let monthToNum = this.monthNameToNumber(monthTo)
        let monthFromNum = this.monthNameToNumber(monthFrom)
        return (((monthToNum - monthFromNum) + 12) % 12) * 30 + (dayTo - dayFrom);
    }

    static addDaysTo(date: string, days: number): string {
        let dateTokens = date.split("-");
        let day = parseInt(dateTokens[0]);
        let month = parseInt(dateTokens[1]);
        let year = new Date().getFullYear();

        // Month is zero-indexed!
        let dateWrapper = new Date(year, month - 1, day);
        dateWrapper.setDate(dateWrapper.getDate() + days);
        return dateWrapper.getDate() + "-" + (dateWrapper.getMonth() + 1);
    }

    static createDate(month: number | string, day: number | string) {
        return day + "-" + month
    }

    static dateToString(startDay: number, startMonth: Month) {
        return this.createDate(this.monthNameToNumber(startMonth), startDay);
    }
}