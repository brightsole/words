import { Condition } from 'dynamoose';
import resolvers from './resolvers';
import { ModelType, Item } from './types';
import { Query as QueryType } from 'dynamoose/dist/ItemRetriever';

const { Query, Mutation } = resolvers;

type ItemModelMock = jest.Mocked<ModelType & QueryType<Item>>;

const createItemModelMock = (
  overrides: Partial<ItemModelMock> = {},
): ItemModelMock => {
  return {
    get: jest.fn().mockReturnThis(),
    query: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    using: jest.fn().mockReturnThis(),
    exec: jest.fn().mockReturnThis(),
    create: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    ...overrides,
  } as ItemModelMock; // the item is partial, which spooks ts
};

describe('Resolvers', () => {
  describe('Queries', () => {
    describe('item(id): Item', () => {
      it('fetches an item given an id', async () => {
        const Item = createItemModelMock({
          get: jest.fn().mockResolvedValue({ id: 'niner' }),
        });

        const item = await Query.item(
          undefined,
          { id: 'niner' },
          { Item, event: {} },
        );
        expect(item).toEqual({ id: 'niner' });
      });

      it('returns undefined when fetching something nonexistent', async () => {
        const Item = createItemModelMock({
          get: jest.fn().mockResolvedValue(undefined),
        });

        const item = await Query.item(
          undefined,
          { id: 'niner' },
          { Item, event: {} },
        );
        expect(item).toEqual(undefined);
      });

      it("allows you to grab someone else's item", async () => {
        const Item = createItemModelMock({
          get: jest.fn().mockResolvedValue({ id: 'niner', owner: 'not-you' }),
        });

        const item = await Query.item(
          undefined,
          { id: 'niner' },
          { Item, event: {} },
        );
        expect(item).toEqual({ id: 'niner', owner: 'not-you' });
      });
    });

    describe('items(id): Item[]', () => {
      it('fetches all items of a given ownerId', async () => {
        const Item = createItemModelMock({
          exec: jest.fn().mockResolvedValue([
            { id: 'niner', owner: 'you' },
            { id: 'five', owner: 'you' },
          ]),
        });

        const items = await Query.items(
          undefined,
          { query: { ownerId: 'you' } },
          { Item, event: {} },
        );
        expect(items).toEqual([
          { id: 'niner', owner: 'you' },
          { id: 'five', owner: 'you' },
        ]);
      });

      it('returns nothing if it is given an unused ownerId', async () => {
        const Item = createItemModelMock({
          exec: jest.fn().mockResolvedValue([]),
        });

        const items = await Query.items(
          undefined,
          { query: { ownerId: 'nonexistent' } },
          { Item, event: {} },
        );
        expect(items).toEqual([]);
      });

      it("allows you to grab someone else's items", async () => {
        const Item = createItemModelMock({
          exec: jest.fn().mockResolvedValue([
            { id: 'niner', owner: 'not-you' },
            { id: 'five', owner: 'not-you' },
          ]),
        });

        const items = await Query.items(
          undefined,
          { query: { ownerId: 'not-you' } },
          { Item, event: {} },
        );
        expect(items).toEqual([
          { id: 'niner', owner: 'not-you' },
          { id: 'five', owner: 'not-you' },
        ]);
      });
    });
  });

  describe('Mutations', () => {
    describe('createItem(name, description): Item', () => {
      it('creates an item when given good info', async () => {
        const Item = createItemModelMock({
          create: jest.fn().mockResolvedValue({
            id: 'niner',
            name: 'Niner',
            ownerId: 'yourself',
            description: 'My favorite number',
          }),
        });

        const item = await Mutation.createItem(
          undefined,
          { name: 'Niner', description: 'My favorite number' },
          { Item, event: {}, ownerId: 'yourself' },
        );
        expect(item).toEqual({
          id: 'niner',
          name: 'Niner',
          ownerId: 'yourself',
          description: 'My favorite number',
        });
      });

      it('explodes if not logged in, because orphan items are verboten', async () => {
        const Item = createItemModelMock({
          create: jest.fn().mockResolvedValue({
            id: 'niner',
            name: 'Niner',
            description: 'My favorite number',
          }),
        });

        await expect(
          Mutation.createItem(
            undefined,
            { name: 'Niner', description: 'My favorite number' },
            { Item, event: {} },
          ),
        ).rejects.toThrow('Unauthorized');
      });
    });

    describe('updateItem(name, description): Item', () => {
      it('updates an item when given good info', async () => {
        const Item = createItemModelMock({
          update: jest.fn().mockResolvedValue({
            id: 'niner',
            name: 'Niner',
            ownerId: 'yourself',
            description: 'My favorite number',
          }),
          get: jest.fn().mockResolvedValue({
            id: 'niner',
            name: 'Niner',
            ownerId: 'yourself',
            description: 'My favorite number',
          }),
        });

        const item = await Mutation.updateItem(
          undefined,
          {
            input: {
              id: 'niner',
              name: 'Niner',
              description: 'My favorite number',
            },
          },
          { Item, event: {}, ownerId: 'yourself' },
        );
        expect(item).toEqual({
          id: 'niner',
          name: 'Niner',
          ownerId: 'yourself',
          description: 'My favorite number',
        });
      });

      it('explodes if no match for id, because its a required property', async () => {
        const Item = createItemModelMock({
          update: jest.fn().mockRejectedValue({
            code: 'ConditionalCheckFailedException',
          }),
        });

        await expect(
          Mutation.updateItem(
            undefined,
            {
              input: {
                id: 'niner',
                name: 'Niner',
                description: 'My favorite number',
              },
            },
            { Item, event: {}, ownerId: 'yourself' },
          ),
        ).rejects.toThrow('Item deleted or owned by another user');
        expect(Item.update).toHaveBeenCalledWith(
          { id: 'niner' },
          {
            description: 'My favorite number',
            name: 'Niner',
            ownerId: 'yourself',
          },
          { condition: expect.any(Condition), returnValues: 'ALL_NEW' },
        );
      });

      it("never lets you overwrite another user's item because auth sets ownerId", async () => {
        const Item = createItemModelMock({
          update: jest.fn().mockRejectedValue({
            code: 'ConditionalCheckFailedException',
          }),
        });

        await expect(
          Mutation.updateItem(
            undefined,
            {
              input: {
                id: 'niner',
                name: 'Niner',
                description: 'My favorite number',
              },
            },
            { Item, event: {}, ownerId: 'yourself' },
          ),
        ).rejects.toThrow('Item deleted or owned by another user');
      });
    });

    describe('deleteItem(name, description): Item', () => {
      it('deletes an item when given good info', async () => {
        const Item = createItemModelMock({
          delete: jest.fn().mockResolvedValue(undefined),
        });

        await expect(
          Mutation.deleteItem(
            undefined,
            { id: 'niner' },
            { Item, event: {}, ownerId: 'yourself' },
          ),
        ).resolves.toBeUndefined();

        expect(Item.delete).toHaveBeenCalledWith('niner', {
          condition: expect.any(Condition),
        });
      });

      it("explodes if the auth owner id doesn't match the target item", async () => {
        const Item = createItemModelMock({
          delete: jest.fn().mockRejectedValue(
            Object.assign(new Error('Conditional check failed'), {
              code: 'ConditionalCheckFailedException',
            }),
          ),
        });

        await expect(
          Mutation.deleteItem(
            undefined,
            { id: 'niner' },
            { Item, event: {}, ownerId: 'yourself' },
          ),
        ).rejects.toThrow('Conditional check failed');

        expect(Item.delete).toHaveBeenCalledWith('niner', {
          condition: expect.any(Condition),
        });
      });
    });
  });
});
