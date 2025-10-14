import type { Model } from 'dynamoose/dist/Model';
import type { Item as DynamooseItem } from 'dynamoose/dist/Item';
import type {
  Context as LambdaContext,
  APIGatewayProxyEventV2,
  APIGatewayProxyEvent,
} from 'aws-lambda';

export type GatewayEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;
export interface LambdaContextFunctionArgument {
  event: GatewayEvent;
  context: LambdaContext;
}

export type ItemType = {
  description?: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  name?: string;
  id: string;
};
export type Item = DynamooseItem & ItemType;
export type ModelType = Model<Item>;

export type IdObject = {
  id: string;
};

export type Context = {
  Item: Model<Item>;
  ownerId?: string;
  event: unknown;
};

export type Affirmative = {
  ok: boolean;
};
