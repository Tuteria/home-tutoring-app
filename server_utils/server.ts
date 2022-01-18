import { fetchGeneratedIpLocation } from "@tuteria/shared-lib/src/new-request-flow/components/LocationSelector/hook";
import {
  fetchAcademicData,
  fetchAllCountries,
  fetchTutorCourseData,
  getCouponCode,
  getLocationInfoFromSheet,
  parceAcademicData,
  getSearchConfig,
} from "@tuteria/tuteria-data/src";
import {
  getNewRequestDetail,
  getSelectedTutorSearchData,
  saveCompletedRequest,
  saveInitializedRequest,
  updateCompletedRequest
} from "./hostService";
import {
  convertServerResultToRequestCompatibleFormat,
  createSearchFilter,
  getTuteriaSearchSubject,
  trimSearchResult
} from "./utils";

export const IS_DEVELOPMENT = process.env.IS_DEVELOPMENT || "development";
export let DEV = IS_DEVELOPMENT === "development";
const NOTIFICATION_SERVICE =
  process.env.NOTIFICATION_SERVICE || "http://email-service.tuteria.com:5000";
const TEST_AGENT_ID = process.env.TEST_AGENT_ID || "";

async function postHelper(url, data, base = "") {
  const response = await fetch(`${base}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  return response;
}

export async function sendEmailNotification(data) {
  let datToSend = data;
  if (IS_DEVELOPMENT === "development") {
    console.log(data);
  }
  if (IS_DEVELOPMENT !== "development") {
    const response = await fetch(`${NOTIFICATION_SERVICE}/send_message/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(datToSend),
    });
    console.log(datToSend);
    const result = await response.json();
    return result;
  }
}

export function getCurrency(currency) {
  let currencies = [
    { symbol: "₦", value: "ngn", country: "NG" },
    { symbol: "€", value: "eur", country: "NG" },
    // {symbol:"₵",value:"ghs",country:"GH"},
    { symbol: "£", value: "gbp", country: "NG" },
    { symbol: "$", value: "usd", country: "NG" },
  ];
  return currencies.find((x) => x.symbol === currency);
}

export async function generatePaymentJson(paymentRequest) {
  let PAYMENT_API =
    process.env.PAYMENT_API || "https://payments-three.vercel.app";
  let PAYMENT_KEY = process.env.PAYMENT_KEY || "ravepay_dev";
  let PAYMENT_KIND = process.env.PAYMENT_KIND || "paystack";

  let paymentUrl = `${PAYMENT_API}/build-payment-info/${PAYMENT_KEY}`;
  let response = await fetch(paymentUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentRequest),
  });
  if (response.status < 500) {
    let result = await response.json();
    if (result.status) {
      let { payment_obj, processor_button_info }: any = result.data;
      let selectedCurrency = getCurrency(processor_button_info.currency);
      let user_details: any = {
        key: payment_obj.key,
        redirect_url: payment_obj.redirect_url,
        kind: PAYMENT_KIND,
        js_script: payment_obj.js_script,
      };
      if (PAYMENT_KIND === "paystack") {
        user_details = { ...user_details, ...processor_button_info };
      } else {
        user_details = {
          ...user_details,
          email: processor_button_info.customer_email,
          first_name: processor_button_info.customer_firstname,
          last_name: processor_button_info.customer_lastname,
          phone_number: processor_button_info.customer_phone,
        };
      }
      return {
        status: true,
        data: {
          order: processor_button_info.txref,
          base_country: selectedCurrency.country,
          currency: selectedCurrency.value,
          amount: payment_obj.amount,
          description: processor_button_info.custom_description,
          title: processor_button_info.custom_title,
          meta: processor_button_info.meta || [],
          user_details,
        },
      };
    }
    return result;
  }
}

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
  requestData.splitRequests = requestData.splitRequests.map(o => ({
    ...o,
    tutorData: undefined
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
  getRequestInfo: async (slug, withAgent, as_parent = false) => {
    let result = await getNewRequestDetail(slug, withAgent, as_parent);
    return result;
  },
  async verifyCoupon(code) {
    let result = await getCouponCode(code);
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
  async saveInitializedRequest({
    discount,
    customerType,
    country_code,
    country,
    phone
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
      phone
    });
  },

  async getSearchConfig() {
    let result = await getSearchConfig();
    let data = {};
    result.forEach(r => {
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
    teacherKind
  }) {
    let searchFilters = splitRequests.map((o, index) =>
      createSearchFilter(
        { splitRequests, contactDetails, lessonDetails, teacherKind },
        index
      )
    );
    let academicDataWithStateInfo = await getAcademicDataWithRadiusInfo();
    let result = await Promise.all(
      searchFilters.map(x =>
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
