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

    const internalAuth = await aws.secretsmanager.getSecretVersionOutput({
      secretId: `jumpingbeen/${$app.stage}/internal-lockdown`,
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

    const authSecrets = internalAuth.secretString.apply((s) => JSON.parse(s!));

    const functionConfig = {
      runtime: 'nodejs22.x' as const,
      timeout: '20 seconds' as const,
      memory: '1024 MB' as const,
      nodejs: {
        format: 'esm' as const,
      },
      environment: {
        ADMIN_USER_ID: process.env.ADMIN_USER_ID || '',
        TABLE_NAME: wordsTable.name,
        CURRENT_WORD_VERSION: '1',
        INTERNAL_SECRET_HEADER_NAME: authSecrets.apply(
          (v) => v.INTERNAL_SECRET_HEADER_NAME,
        ),
        INTERNAL_SECRET_HEADER_VALUE: authSecrets.apply(
          (v) => v.INTERNAL_SECRET_HEADER_VALUE,
        ),
      },
    };

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

    return {
      graphUrl: api.url.apply((url) => `${url}/graphql`),
      restUrl: api.url.apply((url) => `${url}/words`),
      wordsTable: wordsTable.name,
    };
  },
});
