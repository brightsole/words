/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'words-service',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: input?.stage === 'production',
      home: 'aws',
    };
  },
  async run() {
    const wordsTable = new sst.aws.Dynamo('Words', {
      fields: {
        name: 'string',
      },
      primaryIndex: { hashKey: 'name' },
      deletionProtection: $app.stage === 'production',
    });

    const api = new sst.aws.ApiGatewayV2('WordsAPI', {
      link: [wordsTable],
    });

    // new sst.aws.Cron('KeepWarmCron', {
    //   // every 5 minutes, roughly 8am to 6pm, Mon-Fri, Australia/Sydney time
    //   // keeps it warm at all times during business hours
    //   schedule: 'cron(*/5 21-23,0-8 ? * SUN-FRI *)',
    //   job: {
    //     handler: 'src/keepWarm.handler',
    //     environment: {
    //       PING_URL: api.url,
    //     },
    //   },
    // });

    const functionConfig = {
      runtime: 'nodejs22.x',
      timeout: '20 seconds',
      memory: '1024 MB',
      nodejs: {
        format: 'esm',
      },
      environment: {
        ADMIN_USER_ID: process.env.ADMIN_USER_ID || '',
        TABLE_NAME: wordsTable.name,
        CURRENT_WORD_VERSION: '1',
      },
    } as const;

    api.route('ANY /graphql', {
      ...functionConfig,
      handler: 'src/graphqlHandler.handler',
    });

    api.route('GET /words/{proxy+}', {
      ...functionConfig,
      handler: 'src/restHandler.handler',
    });

    api.route('GET /health', {
      ...functionConfig,
      handler: 'src/restHandler.handler',
    });

    // Store the API URL as a CloudFormation output for cross-stack reference
    new aws.ssm.Parameter('WordsApiUrl', {
      name: `/sst/${$app.name}/${$app.stage}/api-url`,
      type: 'String',
      value: api.url,
      description: `API Gateway URL for ${$app.name} ${$app.stage}`,
    });

    // roughly how to get the api url in fed gateway
    // const wordsApiUrl = await aws.ssm.getParameter({
    //   name: `/sst/words-service/${$app.stage}/api-url`,
    // });

    return {
      graphUrl: api.url.apply((url) => `${url}/graphql`),
      restUrl: api.url.apply((url) => `${url}/words`),
      wordsTable: wordsTable.name,
    };
  },
});
