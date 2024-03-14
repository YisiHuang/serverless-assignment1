import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const movieId = event.pathParameters?.movieId;

    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Request body is missing or invalid" }),
      };
    }

    const { content, rating } = JSON.parse(event.body);

    if (!movieId || !content || rating === undefined) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Missing movieId, content, or rating" }),
      };
    }

    const updateParams: UpdateCommandInput = {
      TableName: process.env.TABLE_NAME,
      Key: {
        MovieId: parseInt(movieId),
      },
      UpdateExpression: "set Content = :content, Rating = :rating",
      ExpressionAttributeValues: {
        ":content": content,
        ":rating": rating,
      },
      ReturnValues: "UPDATED_NEW",
    };

    await ddbDocClient.send(new UpdateCommand(updateParams));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Review updated successfully" }),
    };
  } catch (error) {
    console.error("Error updating review:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to update the review", details: error.message }),
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
