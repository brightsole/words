import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { GQLAssociation, GQLLink, WordResolverParent, Context } from '../types';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: number | string; output: number | string; }
  JSONObject: { input: Record<string, unknown>; output: Record<string, unknown>; }
  _FieldSet: { input: any; output: any; }
};

export type Affirmative = {
  __typename?: 'Affirmative';
  ok: Scalars['Boolean']['output'];
};

export type Association = {
  __typename?: 'Association';
  score?: Maybe<Scalars['Float']['output']>;
  type: Scalars['String']['output'];
};

export type Link = {
  __typename?: 'Link';
  associations: Array<Association>;
  name: Scalars['ID']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  deleteWord?: Maybe<Affirmative>;
  forceCacheInvalidation?: Maybe<Affirmative>;
};


export type MutationDeleteWordArgs = {
  name: Scalars['ID']['input'];
};


export type MutationForceCacheInvalidationArgs = {
  name: Scalars['ID']['input'];
};

export type Query = {
  __typename?: 'Query';
  datamuseHealthy?: Maybe<Affirmative>;
  word?: Maybe<Word>;
  wordCount: WordCount;
};


export type QueryWordArgs = {
  name: Scalars['ID']['input'];
};

export type Word = {
  __typename?: 'Word';
  cacheExpiryDate?: Maybe<Scalars['DateTime']['output']>;
  cacheMiss?: Maybe<Scalars['Boolean']['output']>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  definition?: Maybe<WordDefinition>;
  links: Array<Link>;
  name: Scalars['ID']['output'];
  updatedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type WordCount = {
  __typename?: 'WordCount';
  count: Scalars['Int']['output'];
  percentage: Scalars['Float']['output'];
};

export type WordDefinition = {
  __typename?: 'WordDefinition';
  definition?: Maybe<Scalars['String']['output']>;
  partOfSpeech?: Maybe<Scalars['String']['output']>;
  pronunciation?: Maybe<Scalars['String']['output']>;
  source?: Maybe<Scalars['String']['output']>;
};



export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ReferenceResolver<TResult, TReference, TContext> = (
      reference: TReference,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Promise<TResult> | TResult;

      type ScalarCheck<T, S> = S extends true ? T : NullableCheck<T, S>;
      type NullableCheck<T, S> = Maybe<T> extends T ? Maybe<ListCheck<NonNullable<T>, S>> : ListCheck<T, S>;
      type ListCheck<T, S> = T extends (infer U)[] ? NullableCheck<U, S>[] : GraphQLRecursivePick<T, S>;
      export type GraphQLRecursivePick<T, S> = { [K in keyof T & keyof S]: ScalarCheck<T[K], S[K]> };
    

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of federation types */
export type FederationTypes = {
  Word: Word;
};

/** Mapping of federation reference types */
export type FederationReferenceTypes = {
  Word:
    ( { __typename: 'Word' }
    & GraphQLRecursivePick<FederationTypes['Word'], {"name":true}> );
};



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Affirmative: ResolverTypeWrapper<Affirmative>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Association: ResolverTypeWrapper<GQLAssociation>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  JSONObject: ResolverTypeWrapper<Scalars['JSONObject']['output']>;
  Link: ResolverTypeWrapper<GQLLink>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Word: ResolverTypeWrapper<WordResolverParent>;
  WordCount: ResolverTypeWrapper<WordCount>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  WordDefinition: ResolverTypeWrapper<WordDefinition>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Affirmative: Affirmative;
  Boolean: Scalars['Boolean']['output'];
  Association: GQLAssociation;
  Float: Scalars['Float']['output'];
  String: Scalars['String']['output'];
  DateTime: Scalars['DateTime']['output'];
  JSONObject: Scalars['JSONObject']['output'];
  Link: GQLLink;
  ID: Scalars['ID']['output'];
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  Word: WordResolverParent;
  WordCount: WordCount;
  Int: Scalars['Int']['output'];
  WordDefinition: WordDefinition;
};

export type AffirmativeResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Affirmative'] = ResolversParentTypes['Affirmative']> = {
  ok?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type AssociationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Association'] = ResolversParentTypes['Association']> = {
  score?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export interface JsonObjectScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSONObject'], any> {
  name: 'JSONObject';
}

export type LinkResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Link'] = ResolversParentTypes['Link']> = {
  associations?: Resolver<Array<ResolversTypes['Association']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  deleteWord?: Resolver<Maybe<ResolversTypes['Affirmative']>, ParentType, ContextType, RequireFields<MutationDeleteWordArgs, 'name'>>;
  forceCacheInvalidation?: Resolver<Maybe<ResolversTypes['Affirmative']>, ParentType, ContextType, RequireFields<MutationForceCacheInvalidationArgs, 'name'>>;
};

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  datamuseHealthy?: Resolver<Maybe<ResolversTypes['Affirmative']>, ParentType, ContextType>;
  word?: Resolver<Maybe<ResolversTypes['Word']>, ParentType, ContextType, RequireFields<QueryWordArgs, 'name'>>;
  wordCount?: Resolver<ResolversTypes['WordCount'], ParentType, ContextType>;
};

export type WordResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Word'] = ResolversParentTypes['Word'], FederationReferenceType extends FederationReferenceTypes['Word'] = FederationReferenceTypes['Word']> = {
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Word']> | FederationReferenceType, FederationReferenceType, ContextType>;
  cacheExpiryDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  cacheMiss?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  definition?: Resolver<Maybe<ResolversTypes['WordDefinition']>, ParentType, ContextType>;
  links?: Resolver<Array<ResolversTypes['Link']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
};

export type WordCountResolvers<ContextType = Context, ParentType extends ResolversParentTypes['WordCount'] = ResolversParentTypes['WordCount']> = {
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type WordDefinitionResolvers<ContextType = Context, ParentType extends ResolversParentTypes['WordDefinition'] = ResolversParentTypes['WordDefinition']> = {
  definition?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  partOfSpeech?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pronunciation?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type Resolvers<ContextType = Context> = {
  Affirmative?: AffirmativeResolvers<ContextType>;
  Association?: AssociationResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  JSONObject?: GraphQLScalarType;
  Link?: LinkResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Word?: WordResolvers<ContextType>;
  WordCount?: WordCountResolvers<ContextType>;
  WordDefinition?: WordDefinitionResolvers<ContextType>;
};

