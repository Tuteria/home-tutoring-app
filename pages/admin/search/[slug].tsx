import React from "react";
import AdminSearchPage from "@tuteria/shared-lib/src/new-request-flow/pages/AdminSearchPage";
import adapter from "../../../server_utils/client";
import { AdminSearchStore } from "@tuteria/shared-lib/src/stores";
import serverAdapter from "../../../server_utils/server";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { usePrefetchHook } from "../../../server_utils/util";
import { LoadingStateForRequest } from "@tuteria/shared-lib/src/home-tutoring/request-flow/ParentFormPage";

const store = AdminSearchStore.create({}, { adapter });

const useAdminSearchData = (searchStore) => {
  let { router, navigate } = usePrefetchHook({
    routes: [],
    base: "",
  });
  const [loadingText, setLoadingText] = React.useState(
    "Loading Search Page..."
  );
  const slug = router.query.slug;
  const [loaded, setLoaded] = React.useState(false);
  const [completeLoading, setCompleteLoading] = React.useState(true);
  let [requestData, setRequestData] = React.useState<any>({});

  React.useEffect(() => {
    if (slug) {
      adapter
        .initializeAdminSearch(slug)
        .then((result) => {
          setRequestData(result);
          setCompleteLoading(false);
        })
        .catch((error) => {
          setLoadingText("Error fetching request slug");
        });
    }
  }, [slug]);
  return { requestData, completeLoading, loadingText };
};

const AdminSearch: React.FC<{
  regions: any;
  countries: any;
  supportedCountries: any;
  // payload: any;
}> = observer(({ regions = [], countries = [], supportedCountries = [] }) => {
  // useEffect(() => {
  //   storage.set(adapter.regionKey, regions);
  //   storage.set(adapter.countryKey, countries);
  // }, [regions.length, countries.length]);
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
  }, [regions.length, countries.length]);
  const { completeLoading, requestData, loadingText } =
    useAdminSearchData(store);
  if (completeLoading) {
    return <LoadingStateForRequest text={loadingText} />;
  }
  return (
    <AdminSearchPage
      store={store}
      agent={requestData.agent}
      payload={requestData}
    />
  );
});

export async function getStaticProps({}) {
  let [{ regions }, countries, supportedCountries] = await Promise.all([
    serverAdapter.getLocationInfoFromSheet(),
    serverAdapter.fetchAllCountries(),
    serverAdapter.getSupportedCountries(),
  ]);
  return {
    props: { regions, countries, supportedCountries },
  };
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}

// export async function getServerSideProps({ params }) {
//   if (params.slug === "false") {
//     throw new Error("Not found");
//   }
//   let payload = await serverAdapter.getAdminRequestInfo(params.slug);

//   return {
//     props: payload,
//   };
// }

export default AdminSearch;
