import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export const VALID_ROLES = ['admin', 'user'] as const;
export type Role = (typeof VALID_ROLES)[number];

@Injectable()
export class ParseRolePipe implements PipeTransform {
  transform(value: unknown): Role | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (!VALID_ROLES.includes(value as Role)) {
      throw new BadRequestException(
        `Rôle invalide : "${value}". Les valeurs acceptées sont : ${VALID_ROLES.join(', ')}`,
      );
    }

    return value as Role;
  }
}
