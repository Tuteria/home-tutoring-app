import React from "react";
import TutorSelectPage from "@tuteria/shared-lib/src/new-request-flow/pages/TutorSelectPage";
import { SearchStore } from "@tuteria/shared-lib/src/stores";
import adapter from "../../../../server_utils/client";
import serverAdapter from "../../../../server_utils/server";
import { usePrefetchHook } from "../../../../server_utils/util";

const store = SearchStore.create(
  {},
  {
    adapter: {
      ...adapter,
      async onTutorsSelected(data, paymentInfo) {
        let tutor_id = paymentInfo.lessonPayments[0].tutor.userId;
        return await adapter.createPaymentOrder(
          data.slug,
          tutor_id,
          paymentInfo.totalTuition
        );
      },
    },
  }
);

const SelectedTutorPool: React.FC<{
  agent: any;
  firstSearch: any[];
  tutors: any[];
  requestInfo: any;
}> = ({ agent, firstSearch, tutors, requestInfo }) => {
  let { router, navigate } = usePrefetchHook({
    routes: [`/tutors/select/[slug]/[tutor_slug]`],
    base: "",
  });
  function toNextPage(params) {
    navigate(`/tutors/select/${store.slug}/${params}`);
  }
  console.log({ agent, firstSearch, tutors, requestInfo });
  return (
    <TutorSelectPage
      store={store as any}
      agent={agent}
      toNextPage={toNextPage}
      firstSearch={firstSearch}
      tutors={tutors}
      requestInfo={requestInfo}
    />
  );
};

export async function getServerSideProps({ params, res }) {
  if (params.slug !== "false") {
    let {
      agent,
      firstSearch = [],
      tutors = [],
      requestInfo,
    } = await serverAdapter.getProfilesToBeSentToClient(params.slug);
    return {
      props: {
        agent,
        firstSearch,
        tutors,
        requestInfo,
      },
    };
  }
  return { props: {} };
}

export default SelectedTutorPool;
