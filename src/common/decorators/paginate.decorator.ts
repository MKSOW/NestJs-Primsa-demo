import { Query } from '@nestjs/common';

/**
 * Raccourci pour @Query() sur les routes paginées.
 * Le ValidationPipe global transforme automatiquement les query params
 * vers le type déclaré (PaginateDto) grâce à transform: true.
 *
 * Remplace : @Query() pagination: PaginateDto
 * Par       : @Paginate() pagination: PaginateDto
 */
export const Paginate = () => Query();
