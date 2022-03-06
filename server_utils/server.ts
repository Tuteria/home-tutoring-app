import { fetchGeneratedIpLocation } from "@tuteria/shared-lib/src/new-request-flow/components/LocationSelector/hook";
import {
  fetchAcademicData,
  fetchAllCountries,
  fetchTutorCourseData,
  getClientPricingInformation,
  getLocationInfoFromSheet,
  parceAcademicData,
  getSearchConfig,
  getSupportedCountries,
} from "@tuteria/tuteria-data/src";
import {
  createPaymentOrder,
  generatePaymentJson,
  getNewRequestDetail,
  getSelectedTutorSearchData,
  getTutorSearchResults,
  getTutorsInPool,
  getTutorTestimonialAndCerfitications,
  saveCompletedRequest,
  saveInitializedRequest,
  updateCompletedRequest,
  updatePaidRequest,
} from "./hostService";
import {
  buildPaymentRequest,
  convertRequestToServerCompatibleFormat,
  convertServerResultToRequestCompatibleFormat,
  createSearchFilter,
  getTuteriaSearchSubject,
  parseTransportData,
  trimSearchResult,
} from "./utils";

import {
  SAMPLEREQUEST,
  TUTORSEARCHRESULT_DATA,
} from "../../../src/stories/new-request-flow/sampleData";

export const getCountryData = (_country) => {
  let country = _country;
  if (country.toLowerCase() === "united states of america") {
    country = "United States";
  }
  return fetchAllCountries().then((allCountries) => {
    let foundCountry = allCountries.find(
      (x) => x.name.toLowerCase() === country.toLowerCase()
    );
    if (foundCountry) {
      const supportedCountries: any[] = [];

      let foundCurrency = supportedCountries.find(
        (x) => x.name.toLowerCase() === foundCountry.name.toLowerCase()
      );
      let r = null;
      if (foundCurrency) {
        r = { currencySymbol: foundCurrency.currency, dialCode: "" };
        // resolve();
      } else {
        r = { currencySymbol: "$", dialCode: "" };
        // resolve({ currencySymbol: "$", dialCode: "" });
      }
      if (!r) {
        throw new Error("Can't find currency");
      }
      return r;
    }
  });
  // return new Promise((resolve, reject) => {
  // });
};

export function getCurrencyForCountry(country, kind = "to") {
  const exchangeRates = {
    "₦": { $: 200, "£": 250, "€": 250 },
    "₵": { "₦": 0.01, $: 100, "£": 150, "€": 150 },
    S: { "₦": 30, $: 100, "£": 150, "€": 150 },
  };

  let defaultCurrency = kind === "to" ? "$" : "₦";
  let currencies = Object.values(exchangeRates).map((obj) => Object.keys(obj));
  let supportedCurrencies = [].concat.apply([], currencies);
  supportedCurrencies = [...new Set(supportedCurrencies)];
  let fromCurrencies = Object.keys(exchangeRates);
  let result = defaultCurrency;
  return getCountryData(country)
    .then((destinationData) => {
      if (kind == "to") {
        if (supportedCurrencies.includes(destinationData.currencySymbol)) {
          result = destinationData.currencySymbol;
        }
      } else {
        let v = destinationData;
        if (fromCurrencies.includes(destinationData.currencySymbol)) {
          result = destinationData.currencySymbol;
        }
      }
      return result;
    })
    .catch((e) => {
      return defaultCurrency;
    });
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

async function saveParentRequest(
  requestData,
  paymentInfo,
  send_notice = false,
  isAdmin = false
) {
  // need to reduce the information sent to the django server.
  requestData.splitRequests = requestData.splitRequests.map((o) => ({
    ...o,
    tutorData: undefined,
  }));
  if (paymentInfo) {
    let result = await updateCompletedRequest(
      requestData,
      paymentInfo, //temporarily ensure the status is only on issued
      send_notice,
      isAdmin
    );
    return result;
  }
  return await saveCompletedRequest(requestData, isAdmin);
}

const serverAdapter = {
  createPaymentOrder,
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

  async saveParentRequest(
    requestData,
    paymentInfo,
    notifyTutors = false,
    isAdmin
  ) {
    let result = await saveParentRequest(
      requestData,
      paymentInfo,
      notifyTutors,
      isAdmin
    );
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
  async getClientRequest({ requestObj, slug, academicInfo }) {
    let promises = [this.getRequestInfo(slug, true, true)];
    let { ...academicDataWithStateInfo } = academicInfo;
    if (!academicInfo) {
      promises.push(this.getAcademicDataWithRadiusInfo());
    }
    let result = await Promise.all(promises);
    let full = result[0];
    if (!academicInfo) {
      academicDataWithStateInfo = result[1];
    }
    let requestData = requestObj;
    if (!requestData) {
      requestData = full.requestData;
    }
    let { specialities = [] } = parceAcademicData(
      academicDataWithStateInfo.rawAcademicData
    );
    let { farePerKM, distanceThreshold } = parseTransportData(
      academicDataWithStateInfo.state_with_radius,
      requestData
    );
    let arr = [];
    requestData.splitRequests.forEach((o) => {
      arr.push({
        key: o.searchSubject,
        values: specialities
          .filter((b) => b.subjects.includes(o.searchSubject))
          .map((o) => o.speciality),
      });
    });
    // let requestData = await this.getClientRequest(slug, !clearCache, "all");
    return {
      requestData,
      requestInfo: full,
      academicDataWithStateInfo,
      specialities: arr,
      farePerKM,
      distanceThreshold,
    };
  },
  async getSearchPageProps(slug, requestData, query) {
    let requestInfo = requestData;
    if (!requestInfo) {
      let dd = await this.getRequestInfo(slug);
      requestInfo = dd.requestData;
    }
    // when we support other currencies would account for thsi.
    let currencyForCountry = await getCurrencyForCountry("Nigeria", "from");
    let requestFilters = requestInfo.filters || {};
    let filters = {
      gender: (query.gender || "male,female")
        .split(",")
        .map((o) => o.toLowerCase()),
      sortBy: query.sortBy || requestFilters.sortBy || "Recommended",
      showPremium: (query.showPremium || "").toLowerCase() === "true",
      lessonType: query.lessonType || requestFilters.lessonType || "physical",
      minPrice: query.minPrice
        ? parseFloat(query.minPrice)
        : requestFilters.minPrice || 0,
      maxPrice: query.maxPrice
        ? parseFloat(query.maxPrice)
        : requestFilters.maxPrice || 0,
      educationDegrees: query.educationDegree
        ? query.educationDegrees.split(",")
        : requestFilters.educationDegrees || [],
      educationCountries: query.educationCountries
        ? query.educationCountries.split(",")
        : requestFilters.educationCountries || [],
      educationGrades: query.educationGrades
        ? query.educationGrades.split(",")
        : requestFilters.educationGrades || [],
      minExperience: query.minExperience || requestFilters.minExperience || "",
    };
    return {
      requestInfo: {
        ...requestInfo,
        filters,
        slug,
      },
      currencyForCountry,
      access_token: query.act || null,
    };
  },
  getQualifiedTutors: async (
    searchData,
    academicDataWithStateInfo,
    returnSpeciality = false,
    slug = ""
  ) => {
    let { state_with_radius, rawAcademicData, tutorCourses } =
      academicDataWithStateInfo;
    let result = convertRequestToServerCompatibleFormat(
      rawAcademicData,
      searchData
    );
    let found_state = state_with_radius.find(
      (o) => o.state === searchData.state
    );
    let radius = 10; // set default radius with code.
    if (found_state) {
      radius = found_state.radius;
    }
    result.radius = radius;
    try {
      let response = await getTutorSearchResults(result, "post", slug);
      let transformed = convertServerResultToRequestCompatibleFormat(
        response,
        rawAcademicData,
        searchData.searchSubject,
        result.faculties,
        tutorCourses
      ).filter((o) => o.subject.tuteriaName);

      if (returnSpeciality) {
        return { transformed, specialities: result.faculties };
      }
      return transformed;
    } catch (error) {
      throw error;
    }
  },
  transformSearch(
    response: any[],
    academicDataWithStateInfo,
    { lessonDetails, contactDetails, splitRequests }
  ) {
    let { rawAcademicData, tutorCourses } = academicDataWithStateInfo;
    let transformed = convertServerResultToRequestCompatibleFormat(
      response,
      rawAcademicData,
      "",
      [],
      tutorCourses
      // )
      // transformed = transformed.filter(o => o.subject.name);
    ).filter((o) => o.subject.tuteriaName);
    return trimSearchResult(
      transformed,
      [],
      { lessonDetails, contactDetails },
      splitRequests[0],
      [],
      [],
      true,
      {}
    );
  },
  async getProfilesToBeSentToClient(slug, returnSpeciality = false) {
    let [academicDataWithStateInfo, response] = await Promise.all([
      getAcademicDataWithRadiusInfo(),
      getTutorsInPool(slug),
    ]);

    let {
      tutors: result,
      requestInfo,
      agent,
      split_count,
      serverInfo,
    } = response;
    let firstSearch = this.transformSearch(
      result,
      academicDataWithStateInfo,
      requestInfo
    );
    let tutors = [];
    // let tutorSelected = requestInfo.splitRequests
    if (firstSearch.length > 0) {
      if (split_count == 1) {
        if (returnSpeciality === false) {
          requestInfo.splitRequests = requestInfo.splitRequests.map((o) => ({
            ...o,
            tutorId: null,
          }));
          if (requestInfo.splitRequests.length > 1) {
            requestInfo.splitRequests = [requestInfo.splitRequests[0]];
          }
        }
        // tutors = [firstSearch[0]]
      } else {
        tutors = firstSearch;
      }
    }
    return { tutors, requestInfo, agent, firstSearch, split_count, serverInfo };
  },
  async buildSearchFilterAndFetchTutors(
    requestData,
    academicDataWithStateInfo,
    rank = false,
    index = 0,
    includePending = false,
    searchData,
    tutorPoolOnly
  ) {
    // let searchData = createSearchFilter(requestData, index);
    let result = await this.getQualifiedTutors(
      searchData,
      academicDataWithStateInfo,
      true,
      tutorPoolOnly ? requestData.slug : ""
    );
    if (rank) {
      return result;
    }
    let options = await getSearchConfig();
    if (includePending) {
      options.removeMultiplePendingJobs = false;
    }
    return trimSearchResult(
      result.transformed,
      [],
      requestData,
      requestData.splitRequests[index],
      result.specialities,
      [],
      rank,
      [options]
    );
  },
  async getSearchPageResult({ slug, requestObj, query, academicInfo }) {
    let {
      requestData,
      requestInfo: fullRequestData,
      academicDataWithStateInfo,
      specialities,
      farePerKM = 50,
      distanceThreshold = 5,
    } = await this.getClientRequest({ requestObj, slug, academicInfo });
    try {
      let [
        { access_token, currencyForCountry, requestInfo },
        tutorsData,
        firstSearch,
      ] = await Promise.all([
        this.getSearchPageProps(slug, requestData, query),
        this.getTutorsData(slug, requestData, academicDataWithStateInfo),
        this.buildSearchFilterAndFetchTutors(
          requestData,
          academicDataWithStateInfo,
          false,
          0,
          query.pendingRequest === "include"
        ),
      ]);
      let canViewDiscount = true;
      let { paymentInfo } = fullRequestData;
      if (
        paymentInfo &&
        paymentInfo.timeSubmitted &&
        paymentInfo.appliedDiscount
      ) {
        let elapsed = new Date(paymentInfo.timeSubmitted);
        elapsed.setHours(elapsed.getHours() + 2);
        if (elapsed < new Date()) {
          canViewDiscount = false;
        }
      }
      let lessonPayments = fullRequestData.paymentInfo?.lessonPayments || [];
      let tutorPrices = lessonPayments.map((x) => ({
        tutorId: x.tutor.userId,
        rate: x.tutor.subject.hourlyRate,
      }));
      tutorsData = tutorsData.map((o) => {
        if (o) {
          let t = tutorPrices.find((x) => x.tutorId === o.userId);
          if (t) {
            o.subject.hourlyRate = t.rate;
          }
        }
        return o;
      });
      // let firstSearchIds = firstSearch.map((o) => o.userId);
      // tutorsData.forEach((tt) => {
      //   if (tt) {
      //     if (!firstSearchIds.includes(tt.userId)) {
      //       firstSearch = [tt, ...firstSearch];
      //     }
      //   }
      // });
      return {
        status: fullRequestData.status,
        requestInfo,
        tutorPrices,
        access_token,
        tutorsData,
        currencyForCountry,
        slug,
        firstSearch,
        coupon: fullRequestData.paymentInfo?.discountCode || "",
        agent: fullRequestData.agent,
        tutor_responses: fullRequestData.tutor_responses || [],
        canViewDiscount,
        specialities,
        farePerKM,
        distanceThreshold,
      };
    } catch (error) {
      console.trace(error);
      throw error;
    }
  },
  getTestimonials: getTutorTestimonialAndCerfitications,
  async generatePaymentInvoice({ amount, paymentInfo, requestInfo, kind }) {
    try {
      let paymentRequest = buildPaymentRequest(
        amount,
        paymentInfo,
        requestInfo,
        kind
      );
      let [gatewayJson, _] = await Promise.all([
        generatePaymentJson(paymentRequest),
        Promise.resolve({}),
        // this.fetchAndSaveParentRequest(requestInfo, paymentInfo, amount, kind)
      ]);
      return gatewayJson;
    } catch (error) {
      throw error;
    }
  },

  async getClientPaymentInfo(slug, tutor_slug) {
    let { agent, firstSearch, requestInfo, split_count } =
      await this.getProfilesToBeSentToClient(slug, true);
    const bookingInfo = {
      slug: requestInfo.slug,
      tuitionFee: 48000,
      totalLessons: 12,
      totalDiscount: 0,
      transportFare: 0,
      couponDiscount: 0,
      paidSpeakingFee: true,
      distanceThreshold: 20,
      walletBalance: 0,
      fareParKM: 25,
      currency: "₦",
      timeSubmitted: new Date().toISOString(),
    };
    if (split_count === 1) {
      requestInfo.splitRequests = [requestInfo.splitRequests[0]];
    }
    requestInfo = {
      ...requestInfo,
      splitRequests: requestInfo.splitRequests.map((o, i) => {
        return {
          ...o,
          tutorId: o.tutorId || firstSearch[i].userId,
        };
      }),
    };
    return {
      agent,
      tutors: firstSearch,
      requestInfo,
      bookingInfo,
      tutorResponses: requestInfo.splitRequests.map((o) => ({
        status: "accepted",
        tutor_slug: o.tutorId,
      })),
    };
  },
  async verifyPayment({ paystackUrl, paymentInfo, kind = "payment" }) {
    //pull amount from url
    let cleanedUrl = paystackUrl.split("?amount=")[1].split("&")[0] || "";
    let response = await fetch(paystackUrl);
    if (response.status < 500) {
      let result = await response.json();
      let amount = parseFloat(cleanedUrl) / 100;
      if (kind == "payment") {
        await updatePaidRequest({ amount, slug: paymentInfo.slug });
        // await confirmPayment(paymentInfo.slug, amount, kind, "false");
      }
      return { verified: true };
    }
    throw "Could not verify payment";
  },
  getSupportedCountries,
  async getRequestInfoForSearch(slug?: string) {
    let { agent, tutors, requestInfo, split_count, serverInfo } =
      await this.getProfilesToBeSentToClient(slug, true);
    const { academicData } = await this.fetchAcademicData();
    return {
      serverInfo: serverInfo,
      requestInfo: {
        ...requestInfo,
        // splitRequests: [SAMPLEREQUEST.splitRequests[0]],
      },
      firstSearch: null,
      tutors,
      specialities: [],
      academicData: academicData,
      agent,
    };
  },
  async getAdminRequestInfo(slug: string) {
    let [regions, countries, supportedCountries, payload] = await Promise.all([
      this.getRegions(),
      this.getCountries(),
      this.getSupportedCountries(),
      this.getRequestInfoForSearch(slug),
    ]);
    return { regions, countries, supportedCountries, payload };
  },
};

export default serverAdapter;
