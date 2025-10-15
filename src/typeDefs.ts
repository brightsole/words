import { gql } from 'graphql-tag';

export default gql`
  scalar DateTime
  scalar JSONObject

  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.0"
      import: ["@key", "@shareable"]
    )

  type Affirmative {
    ok: Boolean!
  }

  type Association {
    type: String!
    score: Float
  }

  type Link {
    name: ID!
    associations: [Association!]!
  }

  type Word @key(fields: "name") @shareable {
    name: ID!
    cacheExpiryDate: DateTime
    createdAt: DateTime
    updatedAt: DateTime
    links: [Link!]!
  }

  type Query {
    word(name: ID!): Word
  }

  type Mutation {
    forceCacheInvalidation(name: ID!): Affirmative
    deleteWord(id: String!): Affirmative
  }
`;
