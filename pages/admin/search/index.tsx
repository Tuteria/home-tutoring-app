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
      <div/>
      // <AdminSearchPage store={store} agent={payload.agent} payload={payload} isEmptySearch/>
    );
  }
);

export async function getServerSideProps({ params }) {
  let [regions, countries, supportedCountries, academicData] = await Promise.all([
    serverAdapter.getRegions(),
    serverAdapter.getCountries(),
    serverAdapter.getSupportedCountries(),
    serverAdapter.fetchAcademicData(),
  ]);

  const payload = {
    requestInfo: {},
    firstSearch: null,
    tutors: [],
    specialities: [
      { key: "Primary Math", values: ["Engineering", "Sciences"] },
    ],
    academicData: academicData.academicData
  }

  return {
    props: {
      regions,
      countries,
      supportedCountries,
      payload,
    },
  };
}

export default AdminSearch;
