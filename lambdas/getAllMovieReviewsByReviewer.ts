import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const reviewerName = event.pathParameters?.reviewerName;

    if (!reviewerName) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Reviewer name is required" }),
      };
    }

    const commandOutput = await ddbDocClient.send(
      new ScanCommand({
        TableName: process.env.TABLE_NAME,
        FilterExpression: "ReviewerName = :reviewerName",
        ExpressionAttributeValues: {
          ':reviewerName': reviewerName,
        },
      })
    );

    if (!commandOutput.Items || commandOutput.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "No reviews found for the specified reviewer" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ data: commandOutput.Items }),
    };
  } catch (error) {
    console.error("Error retrieving reviews for the specified reviewer:", error);
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: "Failed to retrieve reviews for the specified reviewer", details: error.message }),
    };
  }
};
