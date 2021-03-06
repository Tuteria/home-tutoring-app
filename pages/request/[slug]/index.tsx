import { LoadingStateForRequest } from "@tuteria/shared-lib/src/home-tutoring/request-flow/ParentFormPage";
import storage, { isServer } from "@tuteria/shared-lib/src/local-storage";
import LessonDetailPage from "@tuteria/shared-lib/src/new-request-flow/pages/LessonDetailPage";
import sessionS from "@tuteria/shared-lib/src/storage";
import { SearchStore } from "@tuteria/shared-lib/src/stores";
import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import adapter, { useAuhenticationWrapper } from "../../../server_utils/client";
import serverAdapter from "../../../server_utils/server";

const viewModel = SearchStore.create({}, { adapter });

function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1]);
    }
  }
  console.log("Query variable %s not found", variable);
}

const useHometutoringRequestData = (store, academicData) => {
  const { navigate, router } = useAuhenticationWrapper({ store, base: "" });
  const [loadingText, setLoadingText] = React.useState("Loading Page...");
  const slug = router.query.slug;
  let existing = storage.get(adapter.requestKey, {});
  const [loaded, setLoaded] = useState(false);
  const [completeLoading, setCompleteLoading] = React.useState(true);

  let [requestData, setRequestData] = React.useState(existing);

  let [discountFlag, setDiscountFlag] = useState(false);
  function validCoupon() {
    let cleanedUrl =
      window.location.search.replace("?validDiscount=", "").split("&")[0] || "";
    let validDiscount = router.query.validDiscount || cleanedUrl;
    if (validDiscount === "false") {
      setDiscountFlag(true);
    }
  }
  React.useEffect(() => {
    validCoupon();
    let displayLoading = "";
    if (!isServer) {
      displayLoading = getQueryVariable("available");
      if (displayLoading === "true") {
        setCompleteLoading(false);
      }
    }
    let isAgent = getQueryVariable("is_agent");
    if (slug) {
      adapter
        .getClientRequest(slug, displayLoading === "true")
        .then((result) => {
          let canProceed = false;
          let msg = "Pls try placing a new request";
          if (!result) {
            msg = "Could not find request. Pls try placing a new one.";
            // } else if (result.status === "completed") {
            //   navigate(`/hometutors/search/${result.slug}`);
          } else if (
            result.status !== "issued" &&
            isAgent === "true"
            // !["issued", "completed", "pending"].includes(result.status)
          ) {
            canProceed = true;
            // navigate("/");
          } else if (result.status === "issued") {
            canProceed = true;
          }
          if (canProceed) {
            setCompleteLoading(false);
            setLoadingText("Loading pricing page...");
            let _requestData = { ...result.requestData, slug: result.slug };
            let existing = storage.get(adapter.requestKey, {});
            let merged = { ...existing, ..._requestData };
            if (existing.contactDetails) {
              merged = {
                ...merged,
                contactDetails: {
                  ...existing.contactDetails,
                  ..._requestData.contactDetails,
                },
              };
            }
            storage.set(adapter.requestKey, merged);
            setRequestData(_requestData);
          } else {
            navigate(`/?msg=${msg}`);
          }
        });
    }
  }, [academicData !== undefined, slug]);
  return {
    loaded,
    navigate,
    discountFlag,
    requestData,
    loadingText,
    completeLoading,
    setCompleteLoading,
  };
};
const HomeTutoringRequestPage: React.FC<{
  academicData: any;
  regions: any;
  countries: any;
}> = observer(({ academicData, regions = [], countries = [] }) => {
  const {
    loaded,
    navigate,
    discountFlag,
    loadingText,
    requestData,
    completeLoading,
    setCompleteLoading,
  } = useHometutoringRequestData(viewModel, academicData);
  useEffect(() => {
    storage.set(adapter.regionKey, regions);
    storage.set(adapter.countryKey, countries);
  }, [regions.length, countries.length]);

  if (completeLoading || academicData == undefined) {
    return <LoadingStateForRequest text={loadingText} />;
  }
  function onFormSubmit() {
    // if (viewModel.splitRequests.length === viewModel.splitToExclude.length) {
    //   navigate(`/u/requests/${viewModel.slug}`);
    // } else {
    sessionS.clear(`home-${viewModel.slug}`);
    viewModel
      .updateRequestInfo(false)
      .then(() => {
        navigate(`/request/${viewModel.slug}/pricing`);
      })
      .catch((error) => {
        console.log(error);
      });
    // }
  }
  return (
    <LessonDetailPage
      requestInfo={requestData}
      countries={countries}
      regions={regions}
      viewModel={viewModel}
      onSubmit={onFormSubmit}
      academicData={academicData}
    />
  );
});

export async function getStaticProps({ params, query, res, req }) {
  let [academicData, regions, countries] = await Promise.all([
    serverAdapter.fetchAcademicData(),
    serverAdapter.getRegions(),
    serverAdapter.getCountries(),
  ]);
  return {
    props: {
      academicData: academicData.academicData,
      regions,
      countries,
    },
  };
}
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: true,
  };
}
export default HomeTutoringRequestPage;
