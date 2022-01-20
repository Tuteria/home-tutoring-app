import { defaultView } from '../../middleware';
import serverAdapter from "../../server_utils/server";


export default defaultView(async (req) => {
  let data = await serverAdapter.getIpFromRequest(req);
  return data;
}, { method: "GET" });

