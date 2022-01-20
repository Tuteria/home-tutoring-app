import { defaultView } from '../../middleware';
import serverAdapter from '../../server_utils/server';

export default defaultView(async (req) => {
  const regions = await serverAdapter.getRegions();
  return regions.map(({ state, vicinity }) => ({ state, vicinity }));
}, { method: "GET" });  