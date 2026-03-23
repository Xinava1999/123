import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  
  // 增加用户可见的弹窗提示
  let userMessage = '数据库操作失败';
  if (errInfo.error.includes('permission-denied')) {
    userMessage = `权限不足 (Permission Denied)：请确保您已登录。操作: ${operationType}, 路径: ${path}`;
  } else if (errInfo.error.includes('offline')) {
    userMessage = '网络连接异常 (Offline)，请检查网络。';
  } else {
    userMessage = `发生错误: ${errInfo.error} (操作: ${operationType})`;
  }
  
  // 尝试多种方式提醒用户
  try {
    window.alert(userMessage);
  } catch (e) {
    // Fallback
  }
  
  throw new Error(JSON.stringify(errInfo));
}
