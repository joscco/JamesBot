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

export async function scanTable(args){
    let params = createScanParams(args);
    try {
        const data = await docClient.scan(params).promise();
        return new AWSOperationResult(null, data)
    } catch (err) {
        return new AWSOperationResult(err);
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

