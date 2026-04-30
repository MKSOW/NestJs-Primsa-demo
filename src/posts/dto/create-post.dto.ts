import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostDto {
  @IsString({ message: 'Le titre doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le titre est obligatoire' })
  @MinLength(3, { message: 'Le titre doit contenir au moins 3 caractères' })
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  title!: string;

  @IsString({ message: 'Le contenu doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le contenu est obligatoire' })
  content!: string;

  @IsOptional()
  @IsBoolean({ message: 'published doit être un booléen' })
  published?: boolean = false;

  @Type(() => Number)
  @IsInt({ message: "L'identifiant de l'auteur doit être un entier" })
  @IsPositive({ message: "L'identifiant de l'auteur doit être positif" })
  authorId!: number;

  @IsOptional()
  @IsArray({ message: 'categoryIds doit être un tableau' })
  @IsInt({ each: true, message: 'Chaque categoryId doit être un entier' })
  categoryIds?: number[];
}
