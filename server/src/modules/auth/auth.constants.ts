export const JWT_SECRET = process.env.JWT_SECRET || 'homehub-dev-secret-change-in-production';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'homehub-dev-refresh-secret-change-in-production';

if (!process.env.JWT_SECRET) {
  console.warn('[Auth] JWT_SECRET 未设置，使用默认开发密钥。生产环境务必设置！');
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.warn('[Auth] JWT_REFRESH_SECRET 未设置，使用默认开发密钥。生产环境务必设置！');
}