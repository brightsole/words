import { model } from 'dynamoose';
import type { BaseContext, ContextFunction } from '@apollo/server';
import type {
  LambdaContextFunctionArgument,
  Word as WordType,
  Context,
} from './types';
import WordModel from './Word.schema';
import getEnv from './getEnv';

const setContext: ContextFunction<
  [LambdaContextFunctionArgument],
  BaseContext
> = async ({ event, context }): Promise<Context> => {
  const { id } = event.headers;
  const Word = model<WordType>(getEnv().tableName, WordModel);

  return {
    ...context,
    userId: id,
    event,
    Word,
  };
};

export default setContext;
