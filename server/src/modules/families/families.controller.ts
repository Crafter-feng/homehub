import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FamiliesService } from './families.service';
import { CreateFamilyDto, UpdateFamilyDto, JoinFamilyDto, UpdateMemberRoleDto } from './dto/family.dto';

@Controller('families')
@UseGuards(JwtAuthGuard)
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateFamilyDto) {
    return this.familiesService.create(req.user.id, dto);
  }

  @Get('current')
  getCurrentFamily(@Request() req: any) {
    return this.familiesService.getUserFamily(req.user.id);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.familiesService.getById(parseInt(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateFamilyDto) {
    return this.familiesService.update(parseInt(id), req.user.id, dto);
  }

  @Post(':id/invite-code')
  regenerateInviteCode(@Param('id') id: string, @Request() req: any) {
    return this.familiesService.regenerateInviteCode(parseInt(id), req.user.id);
  }

  @Post('join')
  join(@Request() req: any, @Body() dto: JoinFamilyDto) {
    return this.familiesService.join(req.user.id, dto);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @Request() req: any) {
    return this.familiesService.getMembers(parseInt(id), req.user.id);
  }

  @Put(':id/members/:memberId')
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.familiesService.updateMemberRole(parseInt(id), req.user.id, parseInt(memberId), dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req: any,
  ) {
    return this.familiesService.removeMember(parseInt(id), req.user.id, parseInt(memberId));
  }
}
