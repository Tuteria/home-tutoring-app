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
    let { requestData, paymentInfo, isAdmin, notifyTutors = false } = req.body;
    let isValid = false;
    if (requestData) {
      isValid = true;
    }
    if (paymentInfo) {
      isValid = true;
    }
    // if (!isValid) {
    //   throw "missing information";
    // }
    // remember to change this when switching to the search flow.
    let result = await serverAdapter.saveParentRequest(
      requestData,
      paymentInfo,
      true,
      isAdmin
    );
    return result;
  },
  { method: "POST" }
);
