import { Condition } from 'dynamoose';
import { GraphQLDateTime, GraphQLJSONObject } from 'graphql-scalars';
import { nanoid } from 'nanoid';
import { Context, IdObject, ItemType } from './types';

export default {
  Query: {
    item: async (_: undefined, { id }: { id: string }, { Item }: Context) =>
      Item.get({ id }),
    // for extra security, we could ignore the props passed in, and instead only grab items that belong to
    // the ownerId passed in the headers. This could also be overly limiting if items aren't private
    items: async (
      _: undefined,
      { query: { ownerId } }: { query: { ownerId: string } },
      { Item }: Context,
    ) => Item.query('ownerId').eq(ownerId).using('ownerId').exec(),
  },

  Mutation: {
    createItem: async (
      _: undefined,
      { name, description }: { name?: string; description?: string },
      { ownerId, Item }: Context,
    ): Promise<ItemType> => {
      if (!ownerId) throw new Error('Unauthorized');
      return Item.create({ id: nanoid(), name, description, ownerId });
    },

    updateItem: async (
      _: undefined,
      { input: partialItem }: { input: Partial<ItemType> },
      { ownerId, Item }: Context,
    ): Promise<ItemType> => {
      try {
        const { id, ...rest } = partialItem;
        const updatedItem = await Item.update(
          { id },
          { ...rest, ownerId },
          {
            condition: new Condition()
              .where('ownerId')
              .eq(ownerId)
              .and()
              .attribute('id')
              .exists(),
            returnValues: 'ALL_NEW',
          },
        );
        return updatedItem; // you must await, otherwise the error will be swallowed
      } catch (error: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any).code === 'ConditionalCheckFailedException') {
          throw new Error('Item deleted or owned by another user');
        }
        throw error;
      }
    },

    deleteItem: async (
      _: undefined,
      { id }: IdObject,
      { ownerId, Item }: Context,
    ): Promise<void> =>
      Item.delete(id, {
        condition: new Condition().where('ownerId').eq(ownerId),
      }),
  },

  Item: {
    // for finding out the info of the other items in the system
    __resolveReference: async ({ id }: IdObject, { Item }: Context) =>
      Item.get(id),
  },

  DateTime: GraphQLDateTime,
  JSONObject: GraphQLJSONObject,
};
