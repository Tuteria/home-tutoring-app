import { defaultView } from "../../../../middleware"
import serverAdapter from "../../../../server_utils/server"
type requestBodyType = {
    requestData: any;
    searchIndex: number;
    [key: string]: any;
};
export default defaultView(
    async (req) => {
        let {
            requestData,
            searchIndex,
            includePending = false,
        }: requestBodyType = req.body;
        let { filters = {} } = requestData;
        let academicDataWithStateInfo = await serverAdapter.getAcademicDataWithRadiusInfo();
        let result = await serverAdapter.buildSearchFilterAndFetchTutors(requestData, academicDataWithStateInfo,
            filters?.isFlexible, searchIndex, includePending
        )
        return result
    },
    { method: "POST" }
)
