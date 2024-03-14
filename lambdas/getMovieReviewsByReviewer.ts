import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const { movieId = '' } = event.pathParameters ?? {};
    const reviewerNameOrYear = event.pathParameters?.reviewerName;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing or invalid movie Id" }),
      };
    }
 
    let queryInput;

    if (reviewerNameOrYear && /^\d{4}$/.test(reviewerNameOrYear)) {
      queryInput = {
          TableName: process.env.TABLE_NAME,
          KeyConditionExpression: "MovieId = :movieId",
          FilterExpression: "begins_with(ReviewDate, :year)",
          ExpressionAttributeValues: {
              ":movieId": parseInt(movieId),
              ":year": reviewerNameOrYear,
          },
      };
  } else if (reviewerNameOrYear) {
      queryInput = {
          TableName: process.env.TABLE_NAME,
          KeyConditionExpression: "MovieId = :movieId",
          FilterExpression: "ReviewerName = :reviewerName",
          ExpressionAttributeValues: {
              ":movieId": parseInt(movieId),
              ":reviewerName": reviewerNameOrYear,
          },
      };
  } else {
      return {
          statusCode: 400,
          headers: {
              "content-type": "application/json",
          },
          body: JSON.stringify({ message: "Reviewer name or year is required" }),
      };
  }

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