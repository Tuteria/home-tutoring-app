import { useToast } from "@chakra-ui/react";
import { ClientRequestStore } from "@tuteria/shared-lib/src/home-tutoring/request-flow/store";
import {
  ClientRequestDetail,
  ClientRequestPage,
} from "@tuteria/shared-lib/src/new-request-flow/pages/ClientRequestPage";
import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import adapter from "../../../server_utils/client";
import serverAdapter from "../../../server_utils/server";
import { usePrefetchHook } from "../../../server_utils/util";

const clientStore = ClientRequestStore.create({}, { adapter });

const ClientRequestDetailPage = observer(
  ({
    requestData,
    paymentInfo,
    tutorResponse,
    tutorData,
    host,
  }: {
    requestData: any;
    paymentInfo: any;
    tutorResponse: any;
    tutorData: any;
    host: any;
  }) => {
    const { navigate } = usePrefetchHook({
      base: "",
    });
    const [isLoading, setIsLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
      clientStore.mapToStore(
        requestData,
        paymentInfo,
        tutorData,
        tutorResponse
      );
      setIsLoading(false);
    }, []);

    const updateWhatsAppNumber = async (phoneNumber) => {
      try {
        await adapter.saveWhatsAppNumber(requestData.slug, phoneNumber);
        toast({
          title: "Success",
          description: "Successfully updated WhatsApp information",
          status: "success",
          isClosable: true,
        });
      } catch {
        toast({
          title: "Failed",
          description: "Failed to update WhatsApp information",
          status: "error",
          isClosable: true,
        });
      }
    };
    return isLoading ? null : (
      <ClientRequestPage
        onAddWhatsapp={updateWhatsAppNumber}
        store={clientStore}
        defaultMenu={"Requests"}
        onSideBarItemClick={(item) => navigate(item)}
      >
        <ClientRequestDetail
          currency={clientStore.currency}
          requestInfo={clientStore.info}
          noTutorsFound={clientStore.tutors.length === 0}
          store={clientStore}
          host={host}
        />
      </ClientRequestPage>
    );
  }
);

export async function getServerSideProps({ params, res, req }) {
  let slug = params.slug;
  let promises = [
    serverAdapter.getRequestInfo(slug),
    serverAdapter.getAcademicDataWithRadiusInfo(),
  ];
  let result = await Promise.all(promises);
  let { requestData, paymentInfo, tutor_responses, ...rest } = result[0];
  let tutorData = [];
  let withTutors = requestData.splitRequests.filter((o) => o.tutorId);
  if (withTutors.length > 0) {
    tutorData = await serverAdapter.getTutorsData(slug, requestData, result[1]);
  }
  return {
    props: {
      requestData: { ...requestData, ...rest },
      paymentInfo,
      tutorResponse: tutor_responses,
      tutorData,
      slug,
    },
  };
}

export default ClientRequestDetailPage;
