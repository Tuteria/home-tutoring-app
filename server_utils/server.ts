import { fetchGeneratedIpLocation } from "@tuteria/shared-lib/src/new-request-flow/components/LocationSelector/hook";
import {
  fetchAcademicData,
  fetchAllCountries,
  fetchTutorCourseData,
  getClientPricingInformation,
  getLocationInfoFromSheet,
  parceAcademicData,
  getSearchConfig,
} from "@tuteria/tuteria-data/src";
import {
  getNewRequestDetail,
  getSelectedTutorSearchData,
  saveCompletedRequest,
  saveInitializedRequest,
  updateCompletedRequest,
} from "./hostService";
import {
  convertServerResultToRequestCompatibleFormat,
  createSearchFilter,
  getTuteriaSearchSubject,
  trimSearchResult,
} from "./utils";

async function getTutorsData(
  request_slug,
  requestData,
  academicDataWithStateInfo
) {
  let { rawAcademicData, state_with_radius } = academicDataWithStateInfo;
  let _searchFilters = requestData.splitRequests.map((o, i) => {
    let searchData = createSearchFilter(requestData, i);
    let tuteriaSearchSubject = getTuteriaSearchSubject(
      searchData.searchSubject,
      rawAcademicData
    );
    let searchParam = {
      tutors: [o.tutorId],
      radius: 10,
      country: searchData.country,
      search_subject: tuteriaSearchSubject.name,
    };
    let found_state = state_with_radius.find(
      (o) => o.state === searchData.state
    );
    if (found_state) {
      searchParam.radius = found_state.radius;
    }
    return getSelectedTutorSearchData(searchParam, request_slug).then(
      (result) => {
        return convertServerResultToRequestCompatibleFormat(
          result,
          rawAcademicData,
          searchData.searchSubject
        );
      }
    );
  });
  let result = await Promise.all(_searchFilters);
  let response = result.flat();
  let requestInfo = await getNewRequestDetail(request_slug);
  let r = response.map((o) => {
    let tutor_response = requestInfo.tutor_responses.find(
      (x) => x.tutor_slug == o.userId
    );
    if (
      tutor_response?.status == "declined" ||
      tutor_response?.status == "no_response"
    ) {
      return undefined;
    }
    return o;
  });
  return r;
}

async function getAcademicDataWithRadiusInfo() {
  let [rawAcademicData, { state_with_radius }, tutorCourses] =
    await Promise.all([
      fetchAcademicData(),
      getLocationInfoFromSheet(),
      fetchTutorCourseData(),
    ]);
  let result = parceAcademicData(rawAcademicData);
  return { result, rawAcademicData, state_with_radius, tutorCourses };
}

async function saveParentRequest(requestData, paymentInfo) {
  // need to reduce the information sent to the django server.
  requestData.splitRequests = requestData.splitRequests.map((o) => ({
    ...o,
    tutorData: undefined,
  }));
  if (paymentInfo) {
    let result = await updateCompletedRequest(requestData, paymentInfo);
    return result;
  }
  return await saveCompletedRequest(requestData);
}

const serverAdapter = {
  getAcademicDataWithRadiusInfo,
  getTutorsData,
  getRequestInfo: async (slug, withAgent?: any, as_parent = false) => {
    let result = await getNewRequestDetail(slug, withAgent, as_parent);
    return result;
  },

  getCountries: fetchAllCountries,
  getRegions: async () => {
    let { regions } = await getLocationInfoFromSheet();
    return regions;
  },
  async getIpFromRequest(req) {
    let client_ip = undefined;
    if (req) {
      client_ip = req.headers["x-forwarded-for"] || "";
      client_ip = client_ip.split(",")[0];
    }
    let ipLocations = {};
    ipLocations = await fetchGeneratedIpLocation(client_ip);
    return ipLocations;
  },
  fetchAcademicData: async () => {
    let result = await fetchAcademicData();
    return parceAcademicData(result);
  },
  getBookingInfo: async (slug, is_test = false) => {
    let [academicDataWithStateInfo, requestInfo] = await Promise.all([
      getAcademicDataWithRadiusInfo(),
      getNewRequestDetail(slug),
    ]);
    let tutorsData = await getTutorsData(
      slug,
      requestInfo.requestData,
      academicDataWithStateInfo
    );
    let tutors = requestInfo.paymentInfo.lessonPayments.map((o) => o.tutor);
    return {
      tutorsData: tutorsData.filter(Boolean).map((o, i) => ({
        ...o,
        subject: { ...o.subject, ...tutors[i].subject },
      })),
      requestData: { slug, ...requestInfo.requestData },
      paymentInfo: { tutors, ...requestInfo.paymentInfo, slug },
      status: requestInfo.status,
      agent: requestInfo.agent,
      created: requestInfo.created,
      modified: requestInfo.modified,
    };
  },
  getPricingInfo: getClientPricingInformation,
  async saveInitializedRequest({
    discount,
    customerType,
    country_code,
    country,
    phone,
  }) {
    let discountCode = "";
    if (discount) {
      discountCode = "APPLYFIVE";
    }
    return await saveInitializedRequest({
      discountCode,
      customerType,
      country_code,
      country,
      phone,
    });
  },

  async getSearchConfig() {
    let result = await getSearchConfig();
    let data = {};
    result.forEach((r) => {
      data[r.filters] = r.status.toLowerCase() === "true";
    });
    return data;
  },

  async saveParentRequest(requestData, paymentInfo, notifyTutors = false) {
    let result = await saveParentRequest(requestData, paymentInfo);
    return result;
  },

  async checkAvailabilityOfTutors({
    splitRequests,
    contactDetails,
    lessonDetails,
    teacherKind,
  }) {
    let searchFilters = splitRequests.map((o, index) =>
      createSearchFilter(
        { splitRequests, contactDetails, lessonDetails, teacherKind },
        index
      )
    );
    let academicDataWithStateInfo = await getAcademicDataWithRadiusInfo();
    let result = await Promise.all(
      searchFilters.map((x) =>
        this.getQualifiedTutors(x, academicDataWithStateInfo, true)
      )
    );
    let options = await this.getSearchConfig();
    const data = result.map((item, index) => {
      return trimSearchResult(
        item.transformed,
        [],
        { lessonDetails, contactDetails },
        splitRequests[index],
        item.specialities,
        [],
        true,
        options
      );
    });
    return data;
  },
};

export default serverAdapter;
