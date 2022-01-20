import { defaultView } from '../../../../middleware';
import serverAdapter from "../../../../server_utils/server";

export default defaultView(async (req) => {
  const slug = req.query.slug as string;
  const data = await serverAdapter.getRequestInfo(slug, true, true);
  return data;
}, { method: "GET" });
