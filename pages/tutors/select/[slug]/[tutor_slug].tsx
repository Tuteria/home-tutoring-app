import React from "react";

import { SearchStore } from "@tuteria/shared-lib/src/stores";
import adapter from "../../../../server_utils/client";
import serverAdapter from "../../../../server_utils/server";
import CheckoutPage from "@tuteria/shared-lib/src/new-request-flow/pages/CheckoutPage";

const store = SearchStore.create({}, { adapter });

const CheckoutPaymentPage: React.FC<{
  agent: any;
  bookingInfo: any;
  tutors: any[];
  requestInfo;
  any;
}> = ({ agent, bookingInfo, tutors, requestInfo }) => {
  return (
    <CheckoutPage
      store={store}
      agent={agent}
      onPaymentSuccessful={(url) => {
        console.log(url);
      }}
      initialData={{
        requestInfo,
        tutors,
        bookingInfo,
      }}
    />
  );
};

export async function getServerSideProps({ params, res }) {
  let {
    agent,
    bookingInfo,
    tutors = [],
    requestInfo,
  } = await serverAdapter.getClientPaymentInfo(params.slug, params.tutor_slug);
  return {
    props: {
      agent,
      bookingInfo,
      tutors,
      requestInfo,
    },
  };
}

export default CheckoutPaymentPage;
