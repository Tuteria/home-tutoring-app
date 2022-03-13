import serverAdapter from "../../../server_utils/server";
import { defaultView } from "../../../middleware";

type Response = {
  data: any;
  access_token?: string;
  slug: string;
  status: boolean;
};

export default defaultView(
  async (req) => {
    const result = await serverAdapter.saveTutorInfo(req.body)
    return result
  },
  { method: "POST" }
);
