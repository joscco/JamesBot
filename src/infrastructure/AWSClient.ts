import * as AWS from "aws-sdk";
import {PromiseResult} from "aws-sdk/lib/request";
import {DocumentClient} from "aws-sdk/clients/dynamodb";

type ScanArgs = {
    FilterExpression: string,
    ExpressionAttributeNames: any,
    ExpressionAttributeValues: any
};

export type JamesDateType = "Birthday" | "Garbage"

export type JamesDataBaseItem = {
    event_id: string
    event_type: JamesDateType,
    date: string,
    first_name?: string,
    second_name?: string,
    garbage_type?: string
}

export class AWSClient {
    dynamoClient: DocumentClient
    tableName: string

    constructor() {
        this.dynamoClient = new AWS.DynamoDB.DocumentClient({region: "eu-central-1"});
        this.tableName = process.env.BOT_EVENTS_TABLE;
    }

    public async putItem(item: JamesDataBaseItem): Promise<AWSOperationResult> {
        let params = this.createPutParams(item);
        try {
            await this.dynamoClient.put(params).promise();
            return new AWSOperationResult();
        } catch (err) {
            return new AWSOperationResult(err);
        }
    }

    // Scan only will only retrieve up to one MB of data! So this might produce some missing data problems

    public async scanTable(args: ScanArgs): Promise<AWSOperationResult> {
        let params = this.createScanParams(args);
        try {
            const data = await this.dynamoClient.scan(params).promise();
            data.Items = data.Items.sort(compareDates);
            return new AWSOperationResult(null, data)
        } catch (err) {
            return new AWSOperationResult(err, null);
        }
    }

    public async deleteItem(event_id: string): Promise<AWSOperationResult> {
        let params = this.createDeleteItemParams(event_id);
        try {
            const data = await this.dynamoClient.delete(params).promise();
            return new AWSOperationResult(null, data)
        } catch (err) {
            return new AWSOperationResult(err);
        }
    }


    private createDeleteItemParams(event_id: string): AWS.DynamoDB.DocumentClient.DeleteItemInput {
        return {
            TableName: this.tableName,
            Key: {
                "event_id": event_id
            }
        };
    }

    private createPutParams(item: JamesDataBaseItem): AWS.DynamoDB.DocumentClient.PutItemInput {
        return {
            TableName: this.tableName,
            Item: item
        };
    }

    private createScanParams(args: ScanArgs): AWS.DynamoDB.DocumentClient.ScanInput {
        return {
            TableName: this.tableName,
            FilterExpression: args.FilterExpression,
            ExpressionAttributeNames: args.ExpressionAttributeNames,
            ExpressionAttributeValues: args.ExpressionAttributeValues
        };
    }
}

export class AWSOperationResult {
    hasError: boolean;
    error: AWS.AWSError;
    data: PromiseResult<AWS.DynamoDB.DocumentClient.ScanOutput, AWS.AWSError>;

    constructor(error?: any, data?: any) {
        if (!error) {
            this.hasError = false;
        } else {
            this.hasError = true;
            this.error = error;
        }

        if (data) {
            this.data = data;
        }
    }
}

function compareDates(a: { date: string }, b: { date: string }): number {
    let aArray = a.date.split("-");
    let bArray = b.date.split("-");
    let aMonth = parseInt(aArray[1]);
    let bMonth = parseInt(bArray[1]);
    let aDay = parseInt(aArray[0]);
    let bDay = parseInt(bArray[0]);
    if (aMonth > bMonth) {
        return 1;
    } else if (aMonth < bMonth) {
        return -1;
    } else {
        if (aDay > bDay) {
            return 1;
        } else if (aDay < bDay) {
            return -1;
        } else {
            return 0;
        }
    }
}

