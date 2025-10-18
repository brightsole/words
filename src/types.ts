import type { Model } from 'dynamoose/dist/Model';
import type { Item as DynamooseItem } from 'dynamoose/dist/Item';
import type {
  Context as LambdaContext,
  APIGatewayProxyEventV2,
  APIGatewayProxyEvent,
} from 'aws-lambda';
import { createWordController } from './controller';

export type GatewayEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;
export interface LambdaContextFunctionArgument {
  event: GatewayEvent;
  context: LambdaContext;
}

export type Association = {
  associationType: string;
  matches: { word: string; score?: number }[];
};

type WordDefinition = {
  definition: string;
  partOfSpeech: string;
  pronunciation: string;
  source: string;
};

export type DBWord = {
  definition: WordDefinition | null;
  associations: Association[];
  cacheExpiryDate: number;
  createdAt: number;
  updatedAt: number;
  version: number;
  faulty: boolean;
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
  cacheMiss?: boolean;
  cacheExpiryDate: number;
  createdAt: number;
  updatedAt: number;
  links: { name: string; associations: Link[] }[];
};

export type NameObject = {
  name: string;
};

export type Context = {
  wordController: ReturnType<typeof createWordController>;
  userId?: string;
  event: unknown;
};

export type Affirmative = {
  ok: boolean;
};
