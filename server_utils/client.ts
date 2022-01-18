import storage from "@tuteria/shared-lib/src/local-storage";
import sStorage from "@tuteria/shared-lib/src/storage";

const REGION_KEY = "TEST-REGIONS-VICINITIES";
const COUNTRY_KEY = "TEST-COUNTRIES";
const REQUEST_KEY = "TEST-HOME-TUTORING-REQUEST";
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

const clientAdapter = {
  regionKey: REGION_KEY,
  countryKey: COUNTRY_KEY,
  requestKey: REQUEST_KEY,
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
};

export default clientAdapter;
