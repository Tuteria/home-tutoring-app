import React from "react";
import CompletePage from "@tuteria/shared-lib/src/new-request-flow/pages/CompletePage";
import serverAdapter from "../../../server_utils/server";

const RequestCompletePage = () => {
  return <CompletePage />;
};

export async function getServerSideProps({ params, query, res, req }) {
  let isAgent = query.is_agent;
  let [pricingInfo, bookingInfo] = await Promise.all([
    serverAdapter.getPricingInfo(),
    serverAdapter.getRequestInfo(params.slug, true, true),
  ]);
  let canProceed = false;
  let msg = "Pls try placing a new request";
  if (bookingInfo.status != "issued" && isAgent == "true") {
    canProceed = true;
  } else if (bookingInfo.status === "completed") {
    canProceed = true;
  }
  if (bookingInfo.requestData.splitRequests.length == 0) {
    canProceed = false;
    msg = "Incomplete request info. Pls try placing a new request";
  }
  if (!canProceed) {
    res.writeHead(302, {
      Location: `/?msg=${msg}`,
    });
    res.end();
  }

  return {
    props: {
      pricingInfo,
      requestData: bookingInfo.requestData,
      slug: params.slug,
    },
  };
}

export default RequestCompletePage;
