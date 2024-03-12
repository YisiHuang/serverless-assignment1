import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json"; 

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["Review"] || {});

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
      console.log("Event: ", event);
      const body = event.body ? JSON.parse(event.body) as Record<string, any> : undefined;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return {
          statusCode: 400,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ message: "Invalid request body" }),
        };
      }
  
      if (!isValidBodyParams(body)) {
        return {
          statusCode: 400,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            message: `Incorrect type. Must match Review schema`,
            schema: schema.definitions["Review"],
          }),
        };
      }
  
    const commandOutput = await ddbDocClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME, 
        Item: body,
      })
    );
    return {
      statusCode: 201,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: "Review added successfully" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: "Failed to add review" }),
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