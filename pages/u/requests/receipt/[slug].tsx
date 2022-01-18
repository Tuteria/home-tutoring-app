import Receipts from "@tuteria/shared-lib/src/components/payments/Receipts";
import { RequestFlowStore } from "@tuteria/shared-lib/src/external-pages/request-flow/store";
import { observer } from "mobx-react-lite";
import React, { useEffect } from "react";
import { adapter } from "../../../../server_utils/requests";
import { serverAdapter } from "../../../../server_utils/requests/server";

const bookingStore = RequestFlowStore.create({}, { adapter });

const ReceiptPage = observer(
  ({
    requestData,
    paymentInfo,
    tutorsData,
  }: {
    requestData: any;
    paymentInfo: any;
    tutorsData: any;
  }) => {
    const [loadType, setLoadType] = React.useState("server");
    useEffect(() => {
      bookingStore.mapToStore(requestData, null, tutorsData);
      bookingStore.updateBookingInfo(paymentInfo);
      setLoadType("client");
    }, []);

    let bookingInfo = bookingStore.bookingInfo;
    const gateWayFeeFunction = bookingStore.bookingInfo?.calculateGateWay;

    return bookingInfo ? (
      <Receipts
        key={loadType}
        gateWayFeeFunc={gateWayFeeFunction}
        bookingInfo={bookingInfo}
      />
    ) : null;
  }
);

export async function getServerSideProps({ params, query, res }) {
  let bookingData = await serverAdapter.getBookingInfo(params.slug);
  return {
    props: { ...bookingData },
  };
}

export default ReceiptPage;
