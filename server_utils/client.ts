import { generateSplitRequest } from "@tuteria/shared-lib/src/home-tutoring/request-flow/request-fns";
import storage, { isServer } from "@tuteria/shared-lib/src/local-storage";
import sStorage from "@tuteria/shared-lib/src/storage";
import { resolveCurrencyFromCountry } from "@tuteria/shared-lib/src/utils/hooks";
import jwt_decode from "jwt-decode";
import { useEffect } from "react";
import {
  SAMPLEREQUEST,
  TUTORSEARCHRESULT_DATA_TRIMED,
} from "../../../src/stories/new-request-flow/sampleData";
import { usePrefetchHook } from "./util";
import { trimSearchResult, createSearchFilter } from "./utils";

const REGION_KEY = "TEST-REGIONS-VICINITIES";
const COUNTRY_KEY = "TEST-COUNTRIES";
const REQUEST_KEY = "TEST-HOME-TUTORING-REQUEST";
const CLIENT_TOKEN = "CLIENT_TOKEN";
const SELECTED_TUTORS_KEY = "SELECTED_TUTORS";

function buildFilterFromRequest({ lessonDetails }) {
  let filters = {
    gender: ["male", "female"],
    sortBy: "Recommended",
    showPremium: false,
    lessonType: lessonDetails?.lessonType || "pysical",
    minPrice: 0,
    maxPrice: 0,
    educationDegrees: [],
    educationCountries: [],
    educationGrades: [],
    minExperience: "",
  };
  return filters;
}

async function postFetcher(url, data = {}) {
  let headers: any = {
    "Content-Type": "application/json",
  };
  const response = await fetch(url, {
    headers,
    method: "POST",
    body: JSON.stringify(data),
  });
  return response;
}

function decodedToken(existingTokenFromUrl, key = "tutorToken") {
  let urlAccessToken = existingTokenFromUrl;
  if (!urlAccessToken) {
    //check the local storage for the token.
    urlAccessToken = storage.get(key);
  }
  if (urlAccessToken) {
    //attempt to decode it. if successful, save it to local storage and update the store
    try {
      let result: any = jwt_decode(urlAccessToken);
      storage.set(key, urlAccessToken);
      if (result.slack_id) {
        result.is_staff = true;
      }
      if (result.userId) {
        result.is_tutor = true;
      }
      return result;
    } catch (error) {
      console.log("failed");
    }
  }
}

export const useAuhenticationWrapper = ({ store, base = "" }) => {
  let { router, navigate } = usePrefetchHook({
    routes: [
      "/request",
      "/checkout/[slug]",
      "/search/[slug]",
      "/request/[slug]",
    ],
    base,
  });
  function getAndDecodeAccessToken() {
    //check url for access_token
    let cleanedUrl =
      window.location.search.replace("?act=", "").split("&")[0] || "";
    let urlAccessToken = router.query.act || cleanedUrl;
    let result = clientAdapter.decodedToken(
      urlAccessToken,
      clientAdapter.clientToken
    );
    if (result) {
      if (result.is_staff) {
        if (store.updateAdminLogin) {
          store.updateAdminLogin(true);
        }
      } else {
        if (store.mapToStore) {
          store.mapToStore({ contactDetails: result });
          store.updateLoggedIn(true);
        }
      }
    }
  }
  useEffect(() => {
    if (!isServer) {
      getAndDecodeAccessToken();
    }
  }, []);
  return { router, navigate };
};

async function generateInvoice(
  amountToBePaid,
  paymentInfo,
  requestInfo,
  kind = "full"
) {
  let response = await postFetcher(
    `/api/home-tutoring/generate-payment-invoice`,
    {
      amount: amountToBePaid,
      paymentInfo,
      requestInfo,
      kind,
    }
  );

  if (response.ok) {
    let result = await response.json();
    return result.data.data;
  }
  throw "Error generating invoice";
}
const clientAdapter = {
  regionKey: REGION_KEY,
  countryKey: COUNTRY_KEY,
  requestKey: REQUEST_KEY,
  selectedTutorsKey: SELECTED_TUTORS_KEY,
  clientToken: CLIENT_TOKEN,
  decodedToken,
  async savePricingInfo(requestData, paymentInfo) {
    let response = await postFetcher(`/api/home-tutoring/save-request`, {
      requestData,
      paymentInfo,
    });
    if (response.status < 400) {
      let { data } = await response.json();
      return data;
    }
    throw "Could not save pricing info";
  },
  createIssuedRequest: async (params) => {
    let result = await fetch("/api/home-tutoring/create-issued-request", {
      method: "POST",
      body: JSON.stringify(params),
      headers: {
        "Content-type": "application/json",
      },
    });
    if (result.status < 400) {
      let o = await result.json();
      return o.data;
    }
  },
  async getIpFromRequest() {
    let response = await fetch("/api/get-ip");
    if (response.status < 400) {
      let data = await response.json();
      return data.data;
    }
    throw "Could not fetch IP";
  },
  updateStaticData({ regions, countries, requestInfo = {} }) {
    storage.set(clientAdapter.regionKey, regions);
    storage.set(clientAdapter.countryKey, countries);
    let existing = sStorage.get(clientAdapter.requestKey, {});
    storage.set(clientAdapter.requestKey, {
      ...existing,
      ...requestInfo,
    });
  },
  initializeLandingPage({ regions, countries }) {
    storage.set(clientAdapter.regionKey, regions);
    storage.set(clientAdapter.countryKey, countries);
  },
  getClientRequest: async (slug, cached = false, kind = "default") => {
    if (cached) {
      let key = `home-`;
      if (kind !== "default") {
        key = `home-full-`;
      }
      let savedInfo = sStorage.get(`${key}${slug}`, undefined);
      if (savedInfo && Object.keys(savedInfo).length > 0) {
        return savedInfo;
      }
    }
    let response = await fetch(`/api/home-tutoring/get-request/${slug}`);
    if (response.status < 400) {
      let data = await response.json();
      console.log("DATA!!!", data.data);
      return data.data;
    }
    throw "Could not fetch client info";
  },
  async saveWhatsAppNumber(slug, phoneNumber) {
    const response = await fetch(`/api/home-tutoring/update-whatsapp-number`, {
      body: JSON.stringify({ slug, phoneNumber }),
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw "Failed to update whatsapp number";
  },

  initializeRequestData: async () => {
    let requestData = storage.get(REQUEST_KEY, {});
    let tutorsData = storage.get(SELECTED_TUTORS_KEY, []);
    return [requestData, tutorsData];
  },

  onSubmit: async (key, data, splitRequests, excludeSplit = []) => {
    let requestData = storage.get(REQUEST_KEY, {});
    if (key === "student-details") {
      requestData = { ...requestData, ...data };
    }
    if (key === "teacher-selection") {
      requestData.teacherKind = data.teacherOption;
    }
    if (key === "lesson-schedule") {
      requestData.lessonDetails = {
        ...(requestData.lessonDetails || {}),
        lessonSchedule: {
          ...((requestData.lessonDetails || {}).lessonSchedule || {}),
          ...data,
        },
      };
    }
    if (key === "lesson-location") {
      requestData.contactDetails = {
        ...(requestData.contactDetails || {}),
        vicinity: data.vicinity,
        state: data.state,
        address: data.address,
        country: data.country,
        region: data.region,
      };
      requestData.lessonDetails = {
        ...(requestData.lessonDetails || {}),
        lessonType: data.lessonType,
      };
    }
    if (key === "children-schedule") {
      const schedule = data.reduce(
        (acc, el) => ({
          ...acc,
          ...el,
          lessonDays: [...new Set(el.lessonDays.concat(acc.lessonDays || []))],
        }),
        {}
      );
      requestData.lessonDetails = {
        ...(requestData.lessonDetails || {}),
        lessonSchedule: schedule,
      };
      requestData.clientSchedule = data;
    }
    if (key === "contact-information") {
      requestData.contactDetails = {
        ...(requestData.contactDetails || {}),
        ...data,
      };
    }
    if (key == "client-schedule") {
      requestData.clientSchedule = data || [];
    }
    if (splitRequests) {
      requestData.splitRequests = splitRequests;
      requestData.missingTutorSplitRequests = excludeSplit;
      if (excludeSplit.length > 0) {
        let { childDetails } = requestData;
        let withSubjects = childDetails.map((o) => ({
          name: o.name,
          subjects: o.classDetail.subjects,
        }));
        let missingChild = excludeSplit
          .map((o) => {
            return o.names.map((x) => ({ name: x, subject: o.subjectGroup }));
          })
          .flat();
        let childCopy = JSON.parse(JSON.stringify(childDetails));
        let mapped = childCopy.map((c) => {
          let subjects = missingChild
            .filter((o) => o.name === c.name)
            .map((o) => o.subject)
            .flat();
          return {
            ...c,
            classDetail: {
              ...c.classDetail,
              subjects: c.classDetail.subjects.filter(
                (o) => !subjects.includes(o)
              ),
            },
          };
        });
        requestData.childDetails = mapped;
        requestData.oldChildDetails = childDetails;
        sStorage.delete();
      }
    }
    requestData.filters = buildFilterFromRequest(requestData);
    storage.set(REQUEST_KEY, requestData);
    return data;
  },
  getCountries: async (savedCountry, savedState) => {
    try {
      // let result = { country: "Nigeria" };
      let result: any = {};
      let regions = storage.get(REGION_KEY, []);
      if (Array.isArray(regions) && regions.length > 0) {
        result.regions = regions;
      } else {
        let fetched = false;
        let key = "";
        if (savedCountry || savedState) {
          key = `${savedCountry}-${savedState}`;
          let rr = sStorage.get(key, []);
          if (Array.isArray(rr) && rr.length > 0) {
            result.regions = rr;
            fetched = true;
          }
        }
        if (!fetched) {
          let regionResponse = await fetch("/api/get-vicinities");
          let rData = await regionResponse.json();
          if (key) {
            sStorage.set(key, rData.data);
          }
          result.regions = rData.data;
        }
      }
      let countries = storage.get(COUNTRY_KEY, []);
      if (Array.isArray(countries) && countries.length > 0) {
        result.countries = countries;
      } else {
        let response = await fetch(
          "/api/home-tutoring/country-and-region-info"
        );
        let data = await response.json();
        result.countries = data.data;
      }
      return result;
    } catch (error) {
      throw error;
    }
  },

  getNeighboringArea: async (region) => {
    let response = await fetch(
      `/api/get-neighboring-regions?region=${region}`,
      {
        method: "GET",
        headers: {
          "Content-type": "application/json",
        },
      }
    );
    let result = await response.json();
    return result.data;
  },
  checkIfTutorsExists: async (params) => {
    let requestData = storage.get(REQUEST_KEY, {});
    const response = await fetch("/api/home-tutoring/check-for-tutors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (response.ok) {
      const data = await response.json();
      let result = data.data;
      //cache the original result then return the length of each results
      sStorage.set(`search-${params.slug}`, result);
      //cached result would be used on the search page.
      result = result.map((o) => o.length);

      let map = {};
      result.forEach((o, i) => {
        map[o] = i;
      });
      let mrr = result.filter((o) => o === 0).map((x) => map[x]);
      return mrr;
    }
    throw "Error booking lessons";
    return [];
  },
  saveRequestToServer: async (isAdmin, slug, splitRequests) => {
    let requestData = storage.get(REQUEST_KEY, {});
    if (slug) {
      requestData.slug = slug;
    }
    if (splitRequests) {
      let _sp = generateSplitRequest(
        requestData.childDetails,
        requestData.teacherKind
      );
      requestData.splitRequests = splitRequests.map((o, i) => ({
        ...o,
        ..._sp[i],
      }));
    }
    if (!requestData.dateSubmitted) {
      requestData.dateSubmitted = new Date().toISOString();
    }
    let response = await fetch(`/api/home-tutoring/save-request`, {
      method: "POST",
      body: JSON.stringify({
        requestData: {
          ...requestData,
        },
        isAdmin,
      }),
      headers: {
        "Content-type": "application/json",
      },
    });
    let { data: result } = await response.json();
    if (result.access_token) {
      decodedToken(result.access_token, CLIENT_TOKEN);
    }
    if (result.slug) {
      // save the completed request to session storage so that we do not
      // have to fetch on the search page if we can.
      if (result) {
        sStorage.set(`home-full-${result.slug}`, result);
      }
      return result.slug;
    }
    throw new Error("Error saving request");
  },
  resolveCurrencyFromCountry: resolveCurrencyFromCountry,
  getTestimonials: async (tutorId) => {
    let key = `testimonials-${tutorId}`;
    let rr = sStorage.get(key, {});
    if (Object.keys(rr).length > 0) {
      return rr;
    }
    let response = await postFetcher(`/api/home-tutoring/get-testimonials`, {
      slug: tutorId,
    });
    // let response = await fetch(`/api/home-tutoring/get-testimonials`, {
    //   method: "POST",
    //   body: JSON.stringify({ slug: tutorId }),
    //   headers: {
    //     "Content-type": "application/json"
    //   }
    // });
    let result = await response.json();
    let ss = result.data;
    sStorage.set(key, ss);
    return ss;
  },

  generateInvoice: generateInvoice,
  generateSpeakingInvoice: generateInvoice,
  verifyPayment: async (paystackUrl, paymentInfo) => {
    //pull amount from url
    let response = await postFetcher(`/api/paystack/verify-client-payment`, {
      paystackUrl,
      paymentInfo,
      kind: "payment",
    });
    if (response.status < 400) {
      let { data }: any = response.json();
      return data;
    }
    throw "Could not verify payment";
  },
  verifySpeakingFee: async (paystackUrl, paymentInfo) => {
    let response = await postFetcher(`/api/paystack/verify-client-payment`, {
      paystackUrl,
      paymentInfo,
      kind: "speaking-fee",
    });
    if (response.status < 400) {
      let { data }: any = response.json();
      return data;
    }
    throw "Could not verify payment";
  },
  async onTutorsSelected(data, paymentInfo) {
    // let currentUser = this.getClientInfo();
    let notifyTutors = true;
    // if (currentUser.is_staff) {
    //   notifyTutors = false;
    // }
    let response = await postFetcher(`/api/home-tutoring/save-request`, {
      requestData: { ...data, pendingCompleteDate: new Date().toISOString() },
      paymentInfo: {
        ...paymentInfo,
        timeSubmitted: new Date().toISOString(),
      },
      notifyTutors,
      // isAdmin: currentUser.is_staff
    });
    if (response.status < 400) {
      let result = await response.json();
      // if (result.data) {
      //   sessionS.set(`home-full-${result.slug}`, result.data);
      // }
      return result.data.slug;
    }
    throw "Error saving request on backend";
  },
  async createPaymentOrder(slug, tutor, amount) {
    let response = await postFetcher(
      `/api/home-tutoring/create-payment-order`,
      { slug, tutor, amount }
    );
    if (response.ok) {
      let result = await response.json();
      return result.data;
    }
    throw "Error creating payment order";
  },
  createSearchFilter,
  async initializeAdminSearch(slug) {
    // let response = await fetch(`/api/home-tutoring/search/${slug}`);
    // if (response.status < 400) {
    //   let data = await response.json();
    //   console.log("DATA!!!", data.data);
    //   return data.data;
    // }
    // throw "Could not fetch saerch result";
  },
  async getSearchResults(requestParameters: any) {
    let currentSearchData = TUTORSEARCHRESULT_DATA_TRIMED;
    let searchObj = SAMPLEREQUEST.splitRequests[0];
    let result = trimSearchResult(
      currentSearchData,
      [],
      SAMPLEREQUEST,
      searchObj,
      undefined,
      []
    );
    return result;
  },
  fetchSearchResultFunc: async (
    currentIndex,
    requestData,
    specialities,
    tutorPoolOnly,
    searchData
  ) => {
    let _searchData = searchData;
    if (!searchData) {
      _searchData = createSearchFilter(requestData, currentIndex);
    }
    let response = await postFetcher(`/api/home-tutoring/search`, {
      requestData,
      searchIndex: currentIndex,
      searchData: _searchData,
      tutorPoolOnly,
    });
    if (response.ok) {
      let { data } = await response.json();
      return data;
    }
    throw "Error fetching search result";
  },
  editTutorInfo: async (key: string, data: any) => {
    return "tutorToken";
  },
  updateRequestParameters: async () => {},
  selectDefaultSubject: async (subject, userId) => {
    return {
      hourlyRate: 3500,
      discountForExtraStudents: 60,
      name: subject,
      headline: `I teach ${subject} with practical/illustrative examples.`,
      description: `I love ${subject} because I realized it is actually practical and it is a basis for every other course or subject which involves calculation.`,
      related: [subject],
      tuteriaName: subject,
    };
  },
};

export default clientAdapter;
