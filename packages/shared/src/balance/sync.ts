/**
 * Attunement rules. They are kept apart from the public formulas so that code which never
 * deals with them (the public client) can leave this module out of its bundle. The rules live
 * in the `sync` folder, one concern per file; this module is their single entry point.
 */
export * from './sync/cast.js';
export * from './sync/growth.js';
