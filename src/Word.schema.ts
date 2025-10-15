import { Schema } from 'dynamoose';

export default new Schema(
  {
    name: { type: String, hashKey: true, required: true },
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
