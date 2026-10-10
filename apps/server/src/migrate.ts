import { bootstrap } from './config/bootstrap.js';

// Database migration entry point. The schema arrives with the persistence work; until then
// this only confirms the configuration is valid so deploy scripts can already call it.
const { logger } = bootstrap(new URL('../../../.env', import.meta.url));

logger.info('no database migrations to run yet');
