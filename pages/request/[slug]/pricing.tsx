import { PricingPage } from "@tuteria/shared-lib/src/home-tutoring/request-flow/PricingPage";
import { ClientRequestStore } from "@tuteria/shared-lib/src/home-tutoring/request-flow/store";
import React from "react";
import adapter from "../../../server_utils/client";
import serverAdapter from "../../../server_utils/server";
import { usePrefetchHook } from "../../../server_utils/util";

function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1]);
    }
  }
  console.log("Query variable %s not found", variable);
}
const store = ClientRequestStore.create({}, { adapter });
const NewPricingPage = ({ pricingInfo, requestData, slug }) => {
  const [loaded, setLoaded] = React.useState(false);
  let { navigate } = usePrefetchHook({
    routes: ["/request/[slug]"],
  });
  React.useEffect(() => {
    store.mapToStore(requestData, {
      paymentInfo: {},
      tutorsData: [],
      tutorResponses: [],
      pricingInfo,
    });
    setLoaded(true);
  }, []);
  console.log(store.pricingInfo);
  return loaded ? (
    <PricingPage
      pricingData={store.pricingInfo}
      // pricingData={samplePricingData}
      onEditRequest={() => {
        navigate(`/request/${slug}`);
      }}
      onSelectPlan={(plan, price) => {
        console.log({ plan, price });
      }}
    />
  ) : null;
};

export async function getServerSideProps({ params, query, res, req }) {
  let [pricingInfo, bookingInfo] = await Promise.all([
    serverAdapter.getPricingInfo(),
    serverAdapter.getRequestInfo(params.slug, true, true),
  ]);
  if (bookingInfo.requestData.splitRequests.length == 0) {
    res.writeHead(302, {
      Location: `/request`,
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
export default NewPricingPage;
