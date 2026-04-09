import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restrict route to users whose `User.role` is one of these values. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
