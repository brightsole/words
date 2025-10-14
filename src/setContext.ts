import { model } from 'dynamoose';
import type { BaseContext, ContextFunction } from '@apollo/server';
import type {
  LambdaContextFunctionArgument,
  Item as ItemType,
  Context,
} from './types';
import ItemModel from './Item.schema';
import getEnv from './getEnv';

const setContext: ContextFunction<
  [LambdaContextFunctionArgument],
  BaseContext
> = async ({ event, context }): Promise<Context> => {
  const { id } = event.headers;
  const Item = model<ItemType>(getEnv().tableName, ItemModel);

  return {
    ...context,
    ownerId: id,
    event,
    Item,
  };
};

export default setContext;
