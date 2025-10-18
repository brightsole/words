import type { BaseContext, ContextFunction } from '@apollo/server';
import type { LambdaContextFunctionArgument, Context } from './types';
import { startController } from './controller';

const setContext: ContextFunction<
  [LambdaContextFunctionArgument],
  BaseContext
> = async ({ event, context }): Promise<Context> => {
  const { id } = event.headers;
  const wordController = startController();

  return {
    ...context,
    userId: id,
    event,
    wordController,
  };
};

export default setContext;
