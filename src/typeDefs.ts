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
    ok: Boolean! @shareable
  }

  type Association {
    type: String!
    score: Float
  }

  type Link {
    name: ID!
    associations: [Association!]!
  }

  type WordDefinition {
    definition: String
    partOfSpeech: String
    pronunciation: String
    source: String
  }

  type Word @key(fields: "name") @shareable {
    name: ID!
    definition: WordDefinition
    cacheExpiryDate: DateTime
    createdAt: DateTime
    updatedAt: DateTime
    cacheMiss: Boolean
    links: [Link!]!
  }

  type WordCount {
    count: Int!
    percentage: Float!
  }

  type Query {
    word(name: ID!): Word
    datamuseHealthy: Affirmative
    wordCount: WordCount!
  }

  type Mutation {
    forceCacheInvalidation(name: ID!): Affirmative
    deleteWord(name: ID!): Affirmative
  }
`;
