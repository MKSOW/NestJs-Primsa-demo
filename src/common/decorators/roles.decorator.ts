import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Attache une liste de rôles autorisés à une route ou un controller.
 * Un guard (RolesGuard) lit cette metadata via Reflector pour autoriser ou non.
 *
 * Usage :
 *   @Roles('admin')
 *   @Delete(':id')
 *   remove(...) {}
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
