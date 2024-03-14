import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const movieId = event.pathParameters?.movieId;
    const reviewerName = event.pathParameters?.reviewerName; 

    if (!movieId || !reviewerName) {
      return {
        statusCode: 400, 
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing or invalid movie Id or reviewer name" }),
      };
    }

    const queryInput: QueryCommandInput = {
        TableName: process.env.TABLE_NAME, 
        KeyConditionExpression: "MovieId = :movieId",
        FilterExpression: "ReviewerName = :reviewerName", 
        ExpressionAttributeValues: {
          ":movieId": parseInt(movieId),
          ":reviewerName": reviewerName, 
        },
    };

    const queryOutput = await ddbDocClient.send(new QueryCommand(queryInput));

    if (!queryOutput.Items || queryOutput.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "No reviews found for this movie by the specified reviewer" }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ reviews: queryOutput.Items }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: "Failed to retrieve reviews by the specified reviewer" }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}