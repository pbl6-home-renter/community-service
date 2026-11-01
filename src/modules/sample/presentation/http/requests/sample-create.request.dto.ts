import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SampleCreateCommand } from '../../../application/commands/sample-create/sample-create.command';

export class SampleCreateRequestDto {
  @ApiProperty({ example: 'Sample Title', description: 'Title of the sample' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example: 'Detailed description of the sample',
    description: 'Optional description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  static toCommand(request: SampleCreateRequestDto): SampleCreateCommand {
    return new SampleCreateCommand(request.title, request.description);
  }
}
