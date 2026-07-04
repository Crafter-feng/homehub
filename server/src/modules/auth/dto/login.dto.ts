import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  account: string; // 邮箱或用户名

  @IsString()
  @MinLength(6)
  password: string;
}
