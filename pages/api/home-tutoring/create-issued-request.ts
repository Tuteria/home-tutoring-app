import { defaultView } from '../../../middleware';
import serverAdapter from "../../../server_utils/server";

export default defaultView(async (req) => {
  const result = await serverAdapter.saveInitializedRequest(req.body);
  return result;
}, { method: 'POST' });
