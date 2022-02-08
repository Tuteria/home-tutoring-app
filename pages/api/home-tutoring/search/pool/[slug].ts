import { defaultView } from "../../../../../middleware";
import serverAdapter from "../../../../../server_utils/server";

export default defaultView(
    async (req) => {
        const {slug} = req.query;
        return await serverAdapter.getTutorsInPool(slug); 
    },
    { method: "GET" }
)