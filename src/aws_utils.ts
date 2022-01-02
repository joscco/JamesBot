import * as AWS from "aws-sdk";
import {PromiseResult} from "aws-sdk/lib/request";

let docClient = new AWS.DynamoDB.DocumentClient({region: "eu-central-1"});
const tableName = process.env.BOT_EVENTS_TABLE;

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

type ScanArgs = {
    FilterExpression: string,
    ExpressionAttributeNames: any,
    ExpressionAttributeValues: any
};

function createPutParams(item) {
    return {
        TableName: tableName,
        Item: item
    };
}

function createScanParams(args: ScanArgs) {
    return {
        TableName: tableName,
        FilterExpression: args.FilterExpression,
        ExpressionAttributeNames: args.ExpressionAttributeNames,
        ExpressionAttributeValues: args.ExpressionAttributeValues
    };
}

function createDeleteItemParams(event_id: string) {
    return {
        TableName: tableName,
        Key: {
            "event_id": event_id
        }
    };
}

export async function putItem(item): Promise<AWSOperationResult>{
    let params = createPutParams(item);
    try {
        await docClient.put(params).promise();
        return new AWSOperationResult();
    } catch (err) {
        return new AWSOperationResult(err);
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

// Scan only will only retrieve up to one MB of data! So this might produce some missing data problems
export async function scanTable(args){
    let params = createScanParams(args);
    try {
        const data = await docClient.scan(params).promise();
        data.Items = data.Items.sort(compareDates);
        return new AWSOperationResult(null, data)
    } catch (err) {
        return new AWSOperationResult(err, null);
    }
}

export async function deleteItem(event_id: string){
    let params = createDeleteItemParams(event_id);
    try {
        const data = await docClient.delete(params).promise();
        return new AWSOperationResult(null, data)
    } catch (err) {
        return new AWSOperationResult(err);
    }
}

