import {
  createIELTSUserRecord,
  getIELTSProducts,
  updateIELTSUserRecord,
  getCouponCode,
  buildCart,
  getLocationInfoFromSheet,
  fetchAllCountries,
} from "@tuteria/tuteria-data/src";
import { fetchGeneratedIpLocation } from "@tuteria/shared-lib/src/new-request-flow/components/LocationSelector/hook"

import { verifyPaymentFromPaystack } from "./util";

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

export async function sendSlackNotification(_data) {
  let data = _data;

  // debugger;
  const response = await postHelper(
    `${NOTIFICATION_SERVICE}/send_slack_notification`,
    data,
    ""
  );
  let result = await response.json();
  return result;
}

const constructBody = ({
  template,
  from = "Tuteria <automated@tuteria.com>",
  to,
  data,
}) => {
  let result = {
    backend: "postmark_backend",
    template: template,
    from_mail: from,
    to: [to],
    context: [data],
  };
  return result;
};

function notifyStaffOnPaymentMade(
  clientInfo,
  amount,
  sales_email = "tuteriacorp@gmail.com"
) {
  let data = {
    id: 1,
    date: new Date().toISOString(),
    full_name: clientInfo.full_name,
    email: clientInfo.email,
    phone: clientInfo.phone,
    country: clientInfo.country,
    state: clientInfo.state,
    amount_paid: amount,
  };
  return constructBody({ template: "ielts_complete", to: sales_email, data });
}

function getProductsList(data) {
  const courses = [
    "ultimate-ielts-video-course",
    "complete-ielts-video-course",
    "ielts-writing-band9-sample-writeups",
    "ielts-speaking-task-review",
    "ielts-writing-task-review",
    "ielts-listening-course",
    "ielts-reading-course",
    "ielts-speaking-course",
    "ielts-writing-course",
  ];
  const products = [];
  courses.forEach((course) => {
    const quantity = data[course];
    if (quantity) {
      products.push(`${course.split('-').join(' ')} (${quantity})`);
    }
  });
  return products.join(', ');
}

export function slackChannelNotify(
  clientInfo,
  amount,
  agent_id = "C02L7Q5HUBT"
) {
  const message = `New Sale\nName: ${clientInfo.full_name}\nPhone: ${clientInfo.phone}\nEmail: ${clientInfo.email}\nProducts: ${getProductsList(clientInfo)}\nFull Amount: N${clientInfo.full_amount}\nAmount Paid: N${clientInfo.amount_paid}\nDiscount Code Used: ${clientInfo.discount_code || 'None'}`
  return {
    agentId: agent_id,
    message,
  };
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
const serverAdapter = {
  slackChannelNotify,
  sendSlackNotification,
  async saveUserInfo(userInfo: any, cartItems: any, amount: any) {
    let result = await createIELTSUserRecord(userInfo, cartItems, amount);
    return result;
  },
  async getStoreInfo() {
    let result = await getIELTSProducts();
    let mainProduct = result.find((o) => o.featured === true);
    return {
      heading: "Everything you need to score a Band 8.0 in IELTS",
      mainProduct,
      products: result,
    };
  },
  async updateUserInfo(id: number, data: any, coupon?: any) {
    let result = await updateIELTSUserRecord(id, data);
    if (coupon) {
      result.discountObj = await getCouponCode(result.discount_code || "");
      result.cartItems = await buildCart(result);
    }
    return result;
  },
  async verifyCoupon(code) {
    let result = await getCouponCode(code);
    return result;
  },
  async getPaymentInvoice(
    id: number,
    cartItem: { title: string; description: string },
    amount,
    currency = "₦"
  ) {
    let userInfo = await updateIELTSUserRecord(id, {});
    let orderIdPrefix = `IELTSSTORE${id}`;
    let paymentRequest = {
      amount,
      currency,
      order: orderIdPrefix,
      user: {
        email: userInfo.email,
        phone: userInfo.phone,
        first_name: userInfo.full_name,
        last_name: "",
      },
      processor_info: {
        title: cartItem.title,
        description: cartItem.description,
      },
    };
    let gatewayJson = await generatePaymentJson(paymentRequest);
    return gatewayJson;
  },
  async verifyPayment({ url, id, amount }: any) {
    let result = await verifyPaymentFromPaystack({ url });
    if (result.status) {
      let clientInfo = await updateIELTSUserRecord(id, {
        amount_paid: amount,
      });
      let payload = notifyStaffOnPaymentMade(clientInfo, amount);
      let slackPayload = slackChannelNotify(clientInfo, amount);
      await Promise.all([
        sendEmailNotification(payload),
        sendSlackNotification(slackPayload),
      ]);
    }
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
  }
};

export default serverAdapter;
