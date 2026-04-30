import { Param, ParseIntPipe } from '@nestjs/common';

/**
 * Raccourci pour @Param('id', ParseIntPipe).
 * Remplace : @Param('id', ParseIntPipe) id: number
 * Par       : @ParamId() id: number
 */
export const ParamId = () => Param('id', ParseIntPipe);
