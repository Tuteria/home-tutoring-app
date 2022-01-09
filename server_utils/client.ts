import storage from "@tuteria/shared-lib/src/local-storage";

let key = "IELTS_STORE";
let userId = "IELTS_EXISTING_USER";

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
  loadCart() {
    let result = storage.get(key, []) || [];
    return result;
  },
  loadUserId() {
    return storage.get(userId, null) || null;
  },

  saveUserInfo: async (userInfo, cartData, amount) => {
    let response = await postFetcher("/api/save-user-info", {
      userInfo,
      cartItems: cartData,
      amount,
    });
    if (response.ok) {
      let data = await response.json();
      storage.set(userId, data.data.id);
      return data.data.id;
    }
    throw "Error saving userInfo";
  },
  updateCartItems: (cartItems) => {
    if (cartItems.length === 0) {
      storage.clear(key);
    } else {
      storage.set(key, cartItems);
    }
  },
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
  async verifyPayment(url, clientId, amount) {
    let response = await postFetcher("/api/verify-payment", {
      url,
      id: clientId,
      amount,
    });
    if (response.ok) {
      let data = await response.json();
      //clear all sessionStorage
      storage.clear(userId);
      storage.clear(key);
      return data.data;
    }
    throw "Error verifying payment";
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
      data:result,
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
};

export default clientAdapter;
