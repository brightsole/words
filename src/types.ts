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

type Association = {
  associationType: string;
  matches: { word: string; score?: number }[];
};

export type DBWord = {
  cacheExpiryDate: number;
  associations: Association[];
  createdAt: number;
  updatedAt: number;
  name: string;
};

export type Word = DynamooseItem & DBWord;
export type ModelType = Model<Word>;

type Link = {
  type: string;
  score?: number;
};
export type GQLWord = {
  name: string;
  cacheExpiryDate: number;
  createdAt: number;
  updatedAt: number;
  links: { name: string; associations: Link[] }[];
};

export type NameObject = {
  name: string;
};

export type Context = {
  Word: Model<Word>;
  userId?: string;
  event: unknown;
};

export type Affirmative = {
  ok: boolean;
};
