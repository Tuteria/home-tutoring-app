import AdminSearchPage from "@tuteria/shared-lib/src/new-request-flow/pages/AdminSearchPage";
import { AdminSearchStore } from "@tuteria/shared-lib/src/stores";
import { observer } from "mobx-react-lite";
import React from "react";
import adapter from "../../../server_utils/client";
import serverAdapter from "../../../server_utils/server";

const store = AdminSearchStore.create({}, { adapter });

const AdminSearch: React.FC<{
  payload: any;
}> = observer(({ payload }) => {
  return (
    <AdminSearchPage store={store} agent={payload.agent} payload={payload} />
  );
});

export async function getServerSideProps({ params }) {
  if (params.slug === "false") {
    throw new Error("Not found");
  }
  let { payload } = await serverAdapter.getAdminRequestInfo(params.slug);
  return {
    props: { payload },
  };
}

export default AdminSearch;
