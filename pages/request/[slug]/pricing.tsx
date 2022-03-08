import { PricingPage } from "@tuteria/shared-lib/src/home-tutoring/request-flow/PricingPage";
import { ClientRequestStore } from "@tuteria/shared-lib/src/home-tutoring/request-flow/store";
import { SearchStore } from "@tuteria/shared-lib/src/stores";
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
const store = SearchStore.create({}, { adapter });
const NewPricingPage = ({ pricingInfo, requestData, slug }) => {
  const [loaded, setLoaded] = React.useState(false);
  let { navigate } = usePrefetchHook({
    routes: ["/request/[slug]"],
  });
  React.useEffect(() => {
    store
      .initializeClientRequest({
        requestInfo: requestData,
        tutorResponses: [],
        pricingInfo,
        bookingInfo: {},
      })
      .then(() => {
        // store.mapToStore(rO
        setLoaded(true);
      });
  }, []);
  console.log(store.clientRequest.pricingInfo);
  return loaded ? (
    <PricingPage
      onEditRequest={() => {
        navigate(`/request/${slug}`);
      }}
      store={store.clientRequest}
      onSubmit={() => {
        navigate(`/request/${slug}/complete`);
      }}
    />
  ) : null;
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
  } else if (bookingInfo.status === "issued") {
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
export default NewPricingPage;
