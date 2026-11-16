import { createStarFarmServer } from '../src/server.js';

const host = process.env.STAR_FARM_HOST || '127.0.0.1';
const port = Number(process.env.PORT ?? 8787);
createStarFarmServer().listen(port, host, () => {
  console.log(`Star Farm is listening on ${host}:${port}`);
});
