import { defaultView } from "../../../../middleware";
import serverAdapter from "../../../../server_utils/server";
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
      searchData,
      includePending = false,
      tutorPoolOnly = false,
    }: requestBodyType = req.body;
    let { filters = {} } = requestData;
    let academicDataWithStateInfo =
      await serverAdapter.getAcademicDataWithRadiusInfo();
    let result = await serverAdapter.buildSearchFilterAndFetchTutors(
      requestData,
      academicDataWithStateInfo,
      filters?.isFlexible,
      searchIndex,
      includePending,
      searchData,
      tutorPoolOnly
    );
    return result;
  },
  { method: "POST" }
);
