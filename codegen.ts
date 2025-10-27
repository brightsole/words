import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/typeDefs.ts',
  generates: {
    'src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useTypeImports: true,
        contextType: '../types#Context',
        federation: true,
        mappers: {
          Association: '../types#GQLAssociation',
          Link: '../types#GQLLink',
          Word: '../types#WordResolverParent',
        },
        scalars: {
          DateTime: 'Date',
          JSONObject: 'Record<string, unknown>',
        },
      },
    },
  },
};

export default config;
