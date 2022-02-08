import { defaultView } from "../../../../middleware"
import serverAdapter from "../../../../server_utils/server"
type requestBodyType = {
    requestObj: any;
    query: any;
    slug: string;
    academicInfo: any;
};
export default defaultView(
    async (req) => {
        let {
            requestObj,
            query = {},
            slug,
            academicInfo,
        }: requestBodyType = req.body;
        let result = await serverAdapter.getSearchPageResult({
            requestObj,
            query,
            slug,
            academicInfo,
        });
        return result
    },
    { method: "POST" }
)
