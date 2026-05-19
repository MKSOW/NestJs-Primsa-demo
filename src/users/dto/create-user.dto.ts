import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/decorators';

export class CreateUserDto {
  @Trim()
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(200, { message: 'Le nom ne peut pas dépasser 200 caractères' })
  name!: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstname?: string;

  @Trim()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastname?: string;

  @Trim()
  @IsEmail({}, { message: "L'adresse email est invalide" })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  @MaxLength(150, { message: "L'email ne peut pas dépasser 150 caractères" })
  email!: string;
}
