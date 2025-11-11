import type { BaseContext, ContextFunction } from '@apollo/server';
import type { LambdaContextFunctionArgument, Context } from './types';
import { startController } from './controller';
import { GraphQLError } from 'graphql';
import env from './env';

const setContext: ContextFunction<
  [LambdaContextFunctionArgument],
  BaseContext
> = async ({ event, context }): Promise<Context> => {
  const userId = event.headers['x-user-id'];
  const wordController = startController();

  const body = JSON.parse(event.body ?? '{}');
  const isIntrospectionQuery =
    body?.operationName === 'IntrospectionQuery' &&
    body?.query?.includes('__schema');

  if (
    !isIntrospectionQuery &&
    event.headers[env.authHeaderName] !== env.authHeaderValue
  ) {
    throw new GraphQLError('Unauthorized', {
      extensions: { code: 'UNAUTHORIZED', http: { status: 401 } },
    });
  }

  return {
    ...context,
    userId,
    event,
    wordController,
  };
};

export default setContext;
