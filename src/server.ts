import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import {
  startServerAndCreateLambdaHandler,
  handlers,
} from '@as-integrations/aws-lambda';
import resolvers from './resolvers';
import setContext from './setContext';
import typeDefs from './typeDefs';

const createServer = () => {
  const server = new ApolloServer({
    schema: buildSubgraphSchema([
      {
        typeDefs,
        resolvers,
      },
    ]),
    maxRecursiveSelections: 15,
  });

  return server;
};

export const handler = startServerAndCreateLambdaHandler(
  createServer(),
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
  {
    context: setContext,
  },
);
