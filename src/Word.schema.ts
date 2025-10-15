import { Schema } from 'dynamoose';

export default new Schema(
  {
    name: { type: String, hashKey: true, required: true },
    definition: {
      type: Object,
      schema: {
        definition: String,
        partOfSpeech: String,
        pronunciation: String,
        source: String,
      },
    },
    associations: {
      type: Array,
      schema: [
        {
          type: Object,
          schema: {
            associationType: String,
            matches: {
              type: Array,
              schema: [
                { type: Object, schema: { word: String, score: Number } },
              ],
            },
          },
        },
      ],
    },
    cacheExpiryDate: { type: Date },
  },
  { timestamps: true },
);
