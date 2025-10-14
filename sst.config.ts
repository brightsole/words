/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'items-service',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
    };
  },
  async run() {
    const itemsTable = new sst.aws.Dynamo('Items', {
      fields: {
        id: 'string',
        ownerId: 'string',
      },
      primaryIndex: { hashKey: 'id' },
      globalIndexes: {
        ownerId: { hashKey: 'ownerId' },
      },
      deletionProtection: $app.stage === 'production',
    });

    const api = new sst.aws.ApiGatewayV2('Api', {
      link: [itemsTable],
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

    api.route('ANY /', {
      handler: 'src/server.handler',
      runtime: 'nodejs18.x',
      timeout: '20 seconds',
      memory: '1024 MB',
      nodejs: {
        format: 'esm',
      },
      environment: {
        TABLE_NAME: itemsTable.name,
      },
    });

    return {
      apiUrl: api.url,
      usersTableName: itemsTable.name,
    };
  },
});
