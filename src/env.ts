import { cleanEnv, str, num } from 'envalid';

const env = cleanEnv(process.env, {
  TABLE_NAME: str({
    desc: 'DynamoDB table name for items',
    default: 'ABJECT_FAILURE', // hard errors have wweeeiiird logs
  }),
  AWS_REGION: str({ default: 'ap-southeast-2' }),
  NODE_ENV: str({
    choices: ['development', 'test', 'production', 'staging'],
    default: 'development',
  }),
  ADMIN_USER_ID: str({
    desc: 'Used to auth gate admin actions like cache busting. semi secure',
    default: '', // still falsey so we don't accidentally give admin powers
  }),
  CURRENT_WORD_VERSION: num({
    desc: 'The current version of words in the system',
  }), // set in sst.config.ts to force cache updates for all words
});

export default {
  region: env.AWS_REGION,
  tableName: env.TABLE_NAME,
  adminUserId: env.ADMIN_USER_ID,
  isProduction: env.NODE_ENV === 'production',
  currentWordVersion: env.CURRENT_WORD_VERSION,
};
