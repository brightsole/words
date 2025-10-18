import { Schema } from 'dynamoose';

export default new Schema(
  {
    name: { type: String, hashKey: true, required: true },
    faulty: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
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
                {
                  type: Object,
                  schema: { word: String, score: Number },
                },
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
