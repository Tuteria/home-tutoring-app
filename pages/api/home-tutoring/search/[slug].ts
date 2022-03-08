import { defaultView } from "../../../../middleware";
import serverAdapter from "../../../../server_utils/server";

export default defaultView(
  async (req) => {
    const { slug, isAdmin }: any = req.query;
    if (isAdmin) {
      return await serverAdapter.getAdminRequestInfo(slug);
    }
    return serverAdapter.getProfilesToBeSentToClient(slug);
  },
  { method: "GET" }
);
