import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

interface EnvConfig {
  NODE_ENV?: string;
  PORT?: string;
  DB_TYPE?: string;
  DATABASE_URL?: string;
  SQLITE_DB_PATH?: string;
  JWT_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  CORS_ORIGIN?: string;
}

function validateEnv(): void {
  const env: EnvConfig = process.env as EnvConfig;
  const nodeEnv = env.NODE_ENV || 'development';

  // 生产环境必须配置的变量
  if (nodeEnv === 'production') {
    const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
    const missing = required.filter((key) => !env[key as keyof EnvConfig]);

    if (missing.length > 0) {
      logger.error(`生产环境缺少必要的环境变量: ${missing.join(', ')}`);
      logger.error('请在 .env 文件或系统环境变量中配置这些值');
      process.exit(1);
    }

    // 检查是否使用了默认密钥
    const defaultSecrets = ['homehub-dev-secret-change-in-production', 'homehub-dev-refresh-secret-change-in-production'];
    if (env.JWT_SECRET && defaultSecrets.includes(env.JWT_SECRET)) {
      logger.warn('警告: JWT_SECRET 使用了默认值，生产环境请修改为强密码');
    }
    if (env.JWT_REFRESH_SECRET && defaultSecrets.includes(env.JWT_REFRESH_SECRET)) {
      logger.warn('警告: JWT_REFRESH_SECRET 使用了默认值，生产环境请修改为强密码');
    }
  }

  // 数据库配置校验
  const dbType = env.DB_TYPE || 'sqlite';
  if (dbType === 'postgres' && !env.DATABASE_URL) {
    logger.warn('DB_TYPE=postgres 但未配置 DATABASE_URL，将使用默认连接');
  }

  // 端口校验
  if (env.PORT) {
    const port = parseInt(env.PORT, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      logger.error(`无效的 PORT 值: ${env.PORT}`);
      process.exit(1);
    }
  }

  logger.log(`环境变量校验通过 (环境: ${nodeEnv})`);
}

export { validateEnv };
