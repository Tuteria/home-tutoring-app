import storage, { isServer } from "@tuteria/shared-lib/src/local-storage";
import sStorage from "@tuteria/shared-lib/src/storage";
import jwt_decode from "jwt-decode";
import { useEffect } from "react";
import { usePrefetchHook } from "./util";

const REGION_KEY = "TEST-REGIONS-VICINITIES";
const COUNTRY_KEY = "TEST-COUNTRIES";
const REQUEST_KEY = "TEST-HOME-TUTORING-REQUEST";
const CLIENT_TOKEN = "CLIENT_TOKEN";
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
      let result = jwt_decode(urlAccessToken);
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

export const useAuhenticationWrapper = ({ store, base = "/hometutors" }) => {
  let { router, navigate } = usePrefetchHook({
    routes: ["/request", "/checkout/[slug]", "/search/[slug]"],
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

const clientAdapter = {
  regionKey: REGION_KEY,
  countryKey: COUNTRY_KEY,
  requestKey: REQUEST_KEY,
  clientToken: CLIENT_TOKEN,
  decodedToken,
  async generateInvoice(
    amountToBePaid: number,
    { cartitems, currency, id }: any
  ) {
    let options = {
      NGN: "₦",
    };
    let response = await postFetcher("/api/generate-invoice", {
      id,
      amount: amountToBePaid,
      cartItem: {
        title: `Course purchase`,
        description: `IELTS Course purchase`,
      },
      currency: options[currency.toLowerCase()],
    });
    if (response.ok) {
      let data = await response.json();
      return data.data.data;
    }
    throw "Error generating invoice";
  },
  async updateUserInfo(id: number, data, amountToBePaid) {
    let result = {
      full_amount: amountToBePaid,
      discount_code: data.discountCode || "",
    };
    (data.cartItems || []).forEach((c) => {
      result[c.id] = c.quantity;
    });
    let response = await postFetcher("/api/update-user-info", {
      id,
      data: result,
    });
    if (response.ok) {
      let data = await response.json();
      return data.data.id;
    }
    throw "Error verifying payment";
  },
  async verifyCoupon(coupon: string) {
    let response = await postFetcher("/api/verify-coupon", { code: coupon });
    if (response.ok) {
      let data = await response.json();
      return data.data;
    }
    throw "Error verifying coupon";
  },
  createIssuedRequest(data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({});
      }, 300);
    });
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
    return [requestData, []];
  },
  onSubmit: async (key, data, splitRequests) => {
    return {}
  }
};

export default clientAdapter;

