import React from "react";
import AdminSearchPage from "@tuteria/shared-lib/src/new-request-flow/pages/AdminSearchPage";
import adapter from "../../../server_utils/client";
import { AdminSearchStore } from "@tuteria/shared-lib/src/stores";
import serverAdapter from "../../../server_utils/server";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";

const store = AdminSearchStore.create({}, { adapter });

const AdminSearch: React.FC<{
  regions: any;
  countries: any;
  supportedCountries: any;
  payload: any;
}> = observer(
  ({ regions = [], countries = [], supportedCountries = [], payload }) => {
    useEffect(() => {
      store.useRequestDataProps.lessonLocationStore.updateFields({
        regions,
        countries,
      });
      store.editTutorInfo.initWithStaticData({
        regions,
        countries: countries,
        countriesSupported: supportedCountries,
      });
    }, []);
    return (
      <AdminSearchPage store={store} agent={payload.agent} payload={payload} />
    );
  }
);

export async function getServerSideProps({ params }) {
  if (params.slug === "false") {
    throw new Error("Not found");
  }
  let payload = await serverAdapter.getAdminRequestInfo(params.slug);

  return {
    props: payload,
  };
}

export default AdminSearch;
