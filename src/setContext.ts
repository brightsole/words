import type { BaseContext, ContextFunction } from '@apollo/server';
import type { LambdaContextFunctionArgument, Context } from './types';
import { startController } from './controller';

const setContext: ContextFunction<
  [LambdaContextFunctionArgument],
  BaseContext
> = async ({ event, context }): Promise<Context> => {
  const userId = event.headers['x-user-id'];
  const wordController = startController();

  return {
    ...context,
    userId,
    event,
    wordController,
  };
};

export default setContext;
