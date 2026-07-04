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

  const port = process.env.PORT || 3000;
  await app.listen(port);

  // ── 合并部署：NestJS 直接托管前端 SPA ──
  // 路径优先级：环境变量 > 从 server/dist/ 向上找 client/dist/ > 从 CWD 找
  let clientDistPath =
    process.env.CLIENT_DIST_PATH ||
    join(__dirname, '..', '..', 'client', 'dist');

  if (!existsSync(clientDistPath)) {
    // fallback: 从 CWD 出发（兼容某些 CI/CD 场景）
    clientDistPath = join(process.cwd(), 'client', 'dist');
  }

  if (existsSync(clientDistPath)) {
    const httpAdapter = app.getHttpAdapter().getInstance();
    httpAdapter.use(express.static(clientDistPath));

    // SPA fallback：非 API/非 uploads 的 GET 请求返回 index.html
    httpAdapter.get('*', (req: express.Request, res: express.Response) => {
      if (
        req.path.startsWith('/api/') ||
        req.path.startsWith('/mcp') ||
        req.path.startsWith('/uploads')
      ) {
        return res.status(404).end();
      }
      res.sendFile(join(clientDistPath, 'index.html'));
    });

    logger.log(`静态文件托管: ${clientDistPath}`);
  } else {
    logger.warn(
      `前端静态文件目录不存在: ${clientDistPath}，API 服务仍可正常使用`,
    );
  }

  logger.log(`HomeHub running on http://localhost:${port}`);
}
bootstrap();
