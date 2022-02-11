import React from "react";

import { SearchStore } from "@tuteria/shared-lib/src/stores";
import adapter from "../../../../server_utils/client";
import serverAdapter from "../../../../server_utils/server";
import CheckoutPage from "@tuteria/shared-lib/src/new-request-flow/pages/CheckoutPage";
import { usePrefetchHook } from "../../../../server_utils/util";

const store = SearchStore.create({}, { adapter });

const CheckoutPaymentPage: React.FC<{
  agent: any;
  bookingInfo: any;
  tutors: any[];
  requestInfo;
  any;
}> = ({ agent, bookingInfo, tutors, requestInfo }) => {
  let { router, navigate } = usePrefetchHook({
    routes: [`/tutors/select/[slug]/complete`],
    base: "",
  });
  function onPaymentSuccessful(url) {
    adapter
      .verifyPayment(url, store.bookingInfo.paymentInfo)
      .then(() => {
        navigate(`/tutors/select/${store.slug}/complete`);
      })
      .catch((error) => {
        console.log("Error verifying payment");
      });
  }
  function onSpeakingPaymentSuccessful(url, setLoading) {
    return adapter
      .verifySpeakingFee(url, store.bookingInfo.paymentInfo)
      .then(() => {
        store.bookingInfo.setPaidFee();
        setLoading(false);
        navigate(`/tutors/select/${store.slug}/complete`);
      })
      .catch((error) => {
        console.log("Error verifying payment");
        setLoading(false);
      });
  }
  return (
    <CheckoutPage
      store={store}
      agent={agent}
      onPaymentSuccessful={onPaymentSuccessful}
      onSpeakingFeeSuccessful={onSpeakingPaymentSuccessful}
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
