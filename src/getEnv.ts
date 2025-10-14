export default () => ({
  region: process.env.REGION || 'ap-southeast-2',
  tableName: process.env.TABLE_NAME || 'ABJECT_FAILURE',
});
