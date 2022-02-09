import { defaultView } from '../../../middleware';
import serverAdapter from "../../../server_utils/server";

export default defaultView(async (req) => {
    let result = await serverAdapter.getTestimonials(req.body.slug);
    return result
}, { method: "POST" });

