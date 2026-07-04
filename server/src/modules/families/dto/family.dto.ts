import { IsString, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;
}

export class UpdateFamilyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsOptional()
  name?: string;
}

export class JoinFamilyDto {
  @IsString()
  inviteCode: string;
}

export class UpdateMemberRoleDto {
  @IsEnum(['admin', 'editor', 'viewer'])
  role: 'admin' | 'editor' | 'viewer';
}
