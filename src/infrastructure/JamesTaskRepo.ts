import {AWSClient, JamesDataBaseItem, JamesDateType} from "./AWSClient";
import {ConverterUtils, GarbageType, Month} from "../ConverterUtils";
import {randomUUID} from "crypto";
import {DocumentClient, ScanOutput} from "aws-sdk/clients/dynamodb";

export class JamesTaskRepo {

    private awsClient: AWSClient

    constructor() {
        this.awsClient = new AWSClient()
    }

    async addBirthday(firstName: string, secondName: string, day: number, month: Month) {
        let event = {
            "event_id": randomUUID(),
            "event_type": "Birthday" as JamesDateType,
            "date": day + "-" + ConverterUtils.monthNameToNumber(month),
            "first_name": firstName,
            "second_name": secondName
        };
        return await this.awsClient.putItem(event)
    }

    async addGarbage(garbageType: GarbageType, day: number, month: Month) {
        let event = {
            "event_id": randomUUID(),
            "event_type": "Garbage" as JamesDateType,
            "date": day + "-" + ConverterUtils.monthNameToNumber(month),
            "garbage_type": garbageType
        };
        return await this.awsClient.putItem(event)
    }

    async deleteEvent(event_id: string) {
        return await this.awsClient.deleteItem(event_id)
    }

    async birthdayExists(firstName: string, secondName: string, day: number, month: Month): Promise<boolean> {
        const scanArgs = {
            FilterExpression: "#Type = :birthday and #Datum = :date and #FirstName = :firstName and #SecondName = :secondName",
            ExpressionAttributeNames: {
                "#Datum": "date",
                "#Type": "event_type",
                "#FirstName": "first_name",
                "#SecondName": "second_name"
            },
            ExpressionAttributeValues: {
                ":birthday": "Birthday",
                ":date": day + "-" + ConverterUtils.monthNameToNumber(month),
                ":firstName": firstName,
                ":secondName": secondName
            }
        };
        let result = await this.awsClient.scanTable(scanArgs);
        return result.data && result.data.Count > 0;
    }

    async garbageDateExists(garbageType: GarbageType, day: number, month: Month): Promise<boolean> {
        const scanArgs = {
            FilterExpression: "#Type = :garbage and #Datum = :date and #GarbageType = :garbageType",
            ExpressionAttributeNames: {
                "#Datum": "date",
                "#Type": "event_type",
                "#GarbageType": "garbage_type"
            },
            ExpressionAttributeValues: {
                ":garbage": "Garbage",
                ":date": day + "-" + ConverterUtils.monthNameToNumber(month),
                ":garbageType": garbageType
            }
        };
        let result = await this.awsClient.scanTable(scanArgs);
        return result.data && result.data.Count > 0
    }

    async getBirthdaysForDate(day: number, month: Month) {
       return await this.getDatesForDateAndType(day, month, "Birthday")
    }

    async getGarbagesForDate(day: number, month: Month) {
        return await this.getDatesForDateAndType(day, month, "Garbage")
    }

    async getAllGarbages(): Promise<JamesDataBaseItem[]> {
        return await this.getAllDatesOfType("Garbage")
    }

    async getAllBirthdays(): Promise<JamesDataBaseItem[]>  {
        return await this.getAllDatesOfType("Birthday")
    }

    private async getDatesForDateAndType(day: number, month: Month, type: JamesDateType): Promise<ScanOutput> {
        let birthdayArgs = {
            FilterExpression: "#Datum = :today and #Type = :birthday",
            ExpressionAttributeNames: {
                "#Datum": "date",
                "#Type": "event_type"
            },
            ExpressionAttributeValues: {
                ":today": day + "-" + ConverterUtils.monthNameToNumber(month),
                ":birthday": type
            }
        }

        let scanResult = await this.awsClient.scanTable(birthdayArgs);
        return scanResult.data;
    }

    private async getAllDatesOfType(type: JamesDateType): Promise<JamesDataBaseItem[]> {
        let scanArgs = {
            FilterExpression: "#Type = :type",
            ExpressionAttributeNames: { "#Type": "event_type" },
            ExpressionAttributeValues: { ":type": type }
        };
        let items: JamesDataBaseItem[] = [];
        let lastEvaluatedKey = undefined;

        do {
            const result = await this.awsClient.scanTable({ ...scanArgs, ExclusiveStartKey: lastEvaluatedKey });
            if (result.data.Items) {
                items.push(...result.data.Items.map(item => item as JamesDataBaseItem));
            }
            lastEvaluatedKey = result.data.LastEvaluatedKey;
        } while (lastEvaluatedKey);

        return items;
    }


}