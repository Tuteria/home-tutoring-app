import { defaultView } from '../../../middleware';
import serverAdapter from "../../../server_utils/server";

export default defaultView(async (req) => {
  // const [_, result] = await Promise.all([
  //   // serverAdapter.saveParentRequest(req.body, null),
  //   serverAdapter.checkAvailabilityOfTutors(req.body)
  // ]);
  // return result;
}, { method: "POST" });

