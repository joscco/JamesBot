import * as AWS from "aws-sdk";

let docClient = new AWS.DynamoDB.DocumentClient({region: "eu-central-1"});
const tableName = process.env.BOT_EVENTS_TABLE;

type DataReceiver = (data) => void;
type EmptyReceiver = () => void;
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

export async function putItem(item, positiveAction: EmptyReceiver, failAction: DataReceiver) {
    let params = createPutParams(item);
    try {
        await docClient.put(params).promise();
        positiveAction();
    } catch (err) {
        failAction(err);
    }
}

export async function scanTable(args, positiveAction: DataReceiver, failAction: DataReceiver) {
    let params = createScanParams(args);
    try {
        const data = await docClient.scan(params).promise();
        await positiveAction(data);
    } catch (err) {
        await failAction(err);
    }
}

