import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../common/pipes/parse-role.pipe';

export class PaginateDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit doit être un entier' })
  @Min(1, { message: 'limit doit être au moins 1' })
  @Max(100, { message: 'limit ne peut pas dépasser 100' })
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset doit être un entier' })
  @Min(0, { message: 'offset doit être positif ou zéro' })
  offset?: number = 0;

  role?: Role;
}
