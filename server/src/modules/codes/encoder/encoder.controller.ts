import { Controller, Post, Get, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { EncoderService } from './encoder.service';
import { GenerateDto, BatchGenerateDto } from './dto/encoder.dto';

@Controller('encoder')
@UseGuards(JwtAuthGuard)
export class EncoderController {
  constructor(private readonly encoderService: EncoderService) {}

  @Post('generate')
  generate(@Request() req: any, @Body() dto: GenerateDto) {
    return this.encoderService.generate(req.user.familyId, dto);
  }

  @Post('generate-batch')
  generateBatch(@Request() req: any, @Body() dto: BatchGenerateDto) {
    return this.encoderService.generateBatch(req.user.familyId, dto);
  }

  @Get('jobs')
  listJobs(@Request() req: any) {
    return this.encoderService.listJobs(req.user.familyId);
  }
}