import { profFactor } from '../proficiency';

export const syncGain = (prof: number): number => profFactor(prof) * 2;
