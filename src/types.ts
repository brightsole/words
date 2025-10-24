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

export type WordDefinition = {
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

export type WordResolverParent = DBWord & {
  cacheMiss?: boolean;
};

export type GQLAssociation = {
  type: string;
  score?: number | null;
};

export type GQLLink = {
  name: string;
  associations: GQLAssociation[];
};

export type NameObject = {
  name: string;
};

export type Context = {
  wordController: ReturnType<typeof createWordController>;
  userId?: string;
  event: unknown;
};
