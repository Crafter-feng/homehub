import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';
import * as express from 'express';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // 启动前校验环境变量
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1');

  // 全局异常过滤器 — 统一错误格式，防止堆栈泄漏
  app.useGlobalFilters(new AllExceptionsFilter());

  // 全局响应拦截器 — 统一成功响应格式 {code, data, message}
  app.useGlobalInterceptors(new TransformInterceptor());

  // 静态文件服务（头像等上传文件）
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── 合并部署：NestJS 直接托管前端 SPA ──
  // 路径优先级：环境变量 > 从 server/dist/ 向上找 client/dist/ > 从 CWD 找
  let clientDistPath =
    process.env.CLIENT_DIST_PATH ||
    join(__dirname, '..', '..', 'client', 'dist');

  if (!existsSync(clientDistPath)) {
    clientDistPath = join(process.cwd(), 'client', 'dist');
  }

  if (existsSync(clientDistPath)) {
    // Step 1: 静态文件服务 — 在 NestJS 路由之前注册
    // Express.static 只服务存在的文件，不存在的自动 next()
    app.use(express.static(clientDistPath));

    // Step 2: SPA fallback — 非 API 的 GET 请求返回 index.html
    // 放在 NestJS 路由之前：对于非 API 路径直接返回 index.html
    // API 路径则跳过，交给后面的 NestJS 路由处理
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.method !== 'GET') return next();
      if (
        req.path.startsWith('/api/') ||
        req.path.startsWith('/mcp') ||
        req.path.startsWith('/uploads')
      ) {
        return next();
      }
      res.sendFile(join(clientDistPath, 'index.html'));
    });

    logger.log(`静态文件托管: ${clientDistPath}`);
  } else {
    logger.warn(
      `前端静态文件目录不存在: ${clientDistPath}，API 服务仍可正常使用`,
    );
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`HomeHub running on http://localhost:${port}`);
}
bootstrap();