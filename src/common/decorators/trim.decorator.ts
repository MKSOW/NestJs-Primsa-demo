import { Transform } from 'class-transformer';

/**
 * Supprime les espaces en début et fin de chaîne avant la validation.
 * Évite qu'un utilisateur envoie "  admin  " au lieu de "admin".
 *
 * Usage dans un DTO :
 *   @Trim()
 *   @IsString()
 *   firstname: string;
 */
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
