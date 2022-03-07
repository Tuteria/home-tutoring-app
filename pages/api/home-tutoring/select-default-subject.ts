import { defaultView } from "../../../middleware";
import serverAdapter from "../../../server_utils/server";
export default defaultView(
  async (req) => {
    let { subject = "", email } = req.body;
    let result = await serverAdapter.singleSearchResult({
      default_subject: subject,
      email,
    });
    return subject
      ? result.subject
      : { ...result, rating: parseFloat(result.rating) || 0 };
  },
  { method: "POST" }
);
