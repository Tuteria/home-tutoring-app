import React from "react";

import { SearchStore } from "@tuteria/shared-lib/src/stores";
import adapter from "../../../../server_utils/client";
import serverAdapter from "../../../../server_utils/server";
import NewClientRequestPage from "@tuteria/shared-lib/src/new-request-flow/pages/ClientRequestPage";

const store = SearchStore.create({}, { adapter });

const CompletePage: React.FC<{
  agent: any;
  bookingInfo: any;
  tutors: any[];
  requestInfo: any;
  pricingInfo: any;
  tutorResponses: any[];
}> = ({ bookingInfo, tutors, requestInfo, tutorResponses, pricingInfo }) => {
  return (
    <NewClientRequestPage
      store={store}
      initialData={{
        requestInfo,
        tutors,
        tutorResponses,
        pricingInfo,
        bookingInfo,
      }}
    />
  );
};

export async function getServerSideProps({ params, res }) {
  let [
    { bookingInfo, tutors = [], requestInfo, tutorResponses = [] },
    pricingInfo,
  ] = await Promise.all([
    serverAdapter.getClientPaymentInfo(params.slug, params.tutor_slug),
    serverAdapter.getPricingInfo(),
  ]);
  return {
    props: {
      bookingInfo,
      tutors,
      requestInfo,
      tutorResponses,
      pricingInfo,
    },
  };
}

export default CompletePage;
