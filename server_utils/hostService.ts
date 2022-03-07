import { getCurrency } from "./utils";

export let HOST = process.env.HOST_ENDPOINT || "http://backup.tuteria.com:8000";

async function postHelper(url, data, base = HOST) {
  const response = await fetch(`${base}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  return response;
}

//Tutor api service calls
export async function getSelectedTutorSearchData(params, request_slug) {
  let response = await fetch(`${HOST}/new-flow/search/${request_slug}`, {
    method: "POST",
    body: JSON.stringify(params),
    headers: { "Content-type": "application/json" },
  });
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server");
}

export async function getNewRequestDetail(
  slug,
  withAgent = true,
  as_parent = false
) {
  return await getParentRequestBySlug(slug, withAgent, as_parent);
}

export async function getParentRequestBySlug(
  slug,
  withAgent = false,
  as_parent = false
) {
  let url = `update-home-tutoring-request`;
  if (withAgent) {
    url = `home-tutoring-request`;
  }
  let response = await fetch(
    `${HOST}/new-flow/${url}/${slug}${as_parent ? `?as_parent=true` : ""}`
  );
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Not found");
}

export async function saveInitializedRequest(requestData) {
  let response = await fetch(
    `${HOST}/new-flow/issue-new-home-tutoring-request`,
    {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: {
        "Content-type": "application/json",
      },
    }
  );
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server");
}

export async function getNeighboringArea(region) {
  const defaultRegion = region ? region : "lekki";
  let response = await fetch(
    `${HOST}/new-flow/regions?radius=15&region=${defaultRegion}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server");
}

export async function saveCompletedRequest(requestData, isAdmin) {
  let { slug } = requestData;
  let response = await fetch(
    `${HOST}/new-flow/save-home-tutoring-request/${slug}`,
    {
      method: "POST",
      body: JSON.stringify({ requestData, isAdmin }),
      headers: {
        "Content-type": "application/json",
      },
    }
  );
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server");
}

export async function updateCompletedRequest(
  requestData,
  paymentInfo,
  new_pricing = false,
  isAdmin = false
) {
  let { slug } = requestData;
  let response = await fetch(
    `${HOST}/new-flow/update-home-tutoring-request/${slug}`,
    {
      method: "POST",
      body: JSON.stringify({ requestData, paymentInfo, new_pricing, isAdmin }),
      headers: {
        "Content-type": "application/json",
      },
    }
  );
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server");
}

export async function getTutorSearchResults(searchParams, kind = "get", slug) {
  let response = null;
  if (slug) {
    // fetch tutors who have already applied for this job.
    response = await fetch(`${HOST}/new-flow/admin/search/${slug}/applied`);
  } else {
    if (kind == "post") {
      response = await fetch(`${HOST}/new-flow/search`, {
        method: "POST",
        body: JSON.stringify(searchParams),
        headers: {
          "Content-type": "application/json",
        },
      });
    } else {
      response = await fetch(
        `${HOST}/new-flow/search?` + new URLSearchParams(searchParams)
      );
    }
  }
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server.");
}

export async function getTutorsInPool(slug: string) {
  let response = await fetch(`${HOST}/new-flow/pool-tutors/${slug}`);
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server");
}

export async function getTutorTestimonialAndCerfitications(tutorSlug: string) {
  let response = await fetch(`${HOST}/new-flow/tutor-reviews/${tutorSlug}`);
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server.");
}

export async function createPaymentOrder(data: {
  slug: string;
  tutor: string;
  amount: number;
}) {
  let response = await fetch(
    `${HOST}/new-flow/create-client-order/${data.slug}`,
    {
      method: "POST",
      body: JSON.stringify({
        tutor: data.tutor,
        amount: data.amount,
      }),
      headers: {
        "Content-type": "application/json",
      },
    }
  );
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server.");
}

export async function updatePaidRequest(data: {
  slug: string;
  amount: number;
}) {
  let response = await fetch(
    `${HOST}/new-flow/update-client-order/${data.slug}`,
    {
      method: "POST",
      body: JSON.stringify({
        amount: data.amount,
      }),
      headers: {
        "Content-type": "application/json",
      },
    }
  );
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server.");
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
      let { payment_obj, processor_button_info } = result.data;
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

export async function findTutorByEmail(payload: {
  email: string;
  default_subject?: string;
}) {
  let response = await postHelper(`/new-flow/admin/search/single`, payload);
  if (response.ok) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server");
}

export async function allJobApplicants(slug: string) {
  let response = await fetch(`${HOST}/new-flow/admin/search/${slug}/applied`);
  if (response.ok) {
    let { data } = await response.json();
    return data;
  }
  throw new Error("Error from backend server");
}

export async function addTutorsToPool(
  slug,
  payload: {
    budget: number;
    applicants: Array<{
      tutor_slug: string;
      default_subject: string;
      cost: number;
      lessons: number;
      lessonFee: number;
    }>;
    send_profile?: boolean;
  }
) {
  let response = await postHelper(
    `new-flow/admin/update-request-pool/${slug}`,
    payload
  );
  if (response.ok) {
    let { data } = await response.json();
    return data;
  }
  throw new Error("Error from backend server");
}
