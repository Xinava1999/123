import cloudbase from '@cloudbase/js-sdk';

// 腾讯云开发 (CloudBase) 环境 ID
// 您需要在腾讯云控制台获取此 ID 并设置在环境变量中
const envId = (import.meta as any).env.VITE_TCB_ENV_ID || 'your-env-id';

const app = cloudbase.init({
  env: envId
});

export const auth = app.auth();
export const db = app.database();
export default app;
