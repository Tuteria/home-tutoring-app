import React from "react";
import TutorSelectPage from "@tuteria/shared-lib/src/new-request-flow/pages/TutorSelectPage";
import { SearchStore } from "@tuteria/shared-lib/src/stores";
import adapter from "../../../../server_utils/client";
import serverAdapter from "../../../../server_utils/server";

const store = SearchStore.create({}, { adapter });

const SelectedTutorPool: React.FC<{
  agent: any;
  firstSearch: any[];
  tutors: any[];
  requestInfo;
  any;
}> = ({ agent, firstSearch, tutors, requestInfo }) => {
  return (
    <TutorSelectPage
      store={store}
      agent={agent}
      firstSearch={firstSearch}
      tutors={tutors}
      requestInfo={requestInfo}
    />
  );
};

export async function getServerSideProps({ params, res }) {
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

export default SelectedTutorPool;
