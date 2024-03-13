import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", event);
    const movieId = event.pathParameters?.movieId;
    const minRating = event.queryStringParameters?.minRating;
    const reviewerName = event.queryStringParameters?.reviewerName;

    if (!movieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing or invalid movie Id" }),
      };
    }

    const expressionAttributeValues = {
      ":movieId": parseInt(movieId),
    };

    let filterExpressions: string[] = [];

    if (minRating) {
      expressionAttributeValues[":minRating"] = parseInt(minRating);
      filterExpressions.push("Rating > :minRating");
    }

    if (reviewerName) {
      expressionAttributeValues[":reviewerName"] = reviewerName;
      filterExpressions.push("ReviewerName = :reviewerName");
    }

    const filterExpression = filterExpressions.join(" AND ");

    const queryInput: QueryCommandInput = {
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "MovieId = :movieId",
        ExpressionAttributeValues: expressionAttributeValues,
        ...(filterExpressions.length > 0 && { FilterExpression: filterExpression }),
    };

    /*if (minRating) {
        queryInput.FilterExpression = 'Rating > :minRating';
    }*/

    const queryOutput = await ddbDocClient.send(new QueryCommand(queryInput));

    if (!queryOutput.Items || queryOutput.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "No reviews found for this movie" }),
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
      body: JSON.stringify({ error: "Failed to retrieve reviews" }),
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