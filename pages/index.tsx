import { OverlayRouter } from "@tuteria/shared-lib/src/components/OverlayRouter";
import LandingPage from "@tuteria/shared-lib/src/new-request-flow/pages/LandingPage";
import sessionS from '@tuteria/shared-lib/src/storage';
import { LocationFieldStore } from "@tuteria/shared-lib/src/stores/location";
import React from "react";
import adapter, { useAuhenticationWrapper } from "../server_utils/client";
import serverAdapter from "../server_utils/server";
import { useToastHelper } from "../server_utils/util";

const store = LocationFieldStore.create({}, { adapter });

const useFetchRegion = () => {
  const [country, setCountry] = React.useState("");
  const [country_code, setCountryCode] = React.useState("");
  React.useEffect(() => {
    adapter
      .getIpFromRequest()
      .then((result) => {
        setCountry(result.country);
        setCountryCode(result.country_code);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);
  return [country, country_code];
};
const Home = ({ regions, countries }) => {
  const { navigate } = useAuhenticationWrapper({ store });
  const [loadType, setLoadType] = React.useState("server");
  const [isLoading, setLoading] = React.useState(false);
  const { showErrorToast } = useToastHelper();
  const ipInfo = useFetchRegion();
  React.useEffect(() => {
    adapter.initializeLandingPage({ regions, countries });
    store.updateFields({
      countries,
      regions,
      country: ipInfo[0],
      country_code: ipInfo[1],
    });
    setLoadType("client");
  }, ipInfo);
  function onSubmitForm(values) {
    store.updateFields(values);
    setLoading(true);
    adapter
      .createIssuedRequest(values)
      .then((o: any) => {
        let discountCode = values.discount;
        let url = `/request/${o.slug}?available=true`;
        sessionS.set(`home-${o.slug}`, o);
        if (discountCode && o.validDiscount == false) {
          url = `${url}&validDiscount=false`;
        }
        navigate(url);
      })
      .catch((error) => {
        setLoading(false);
        showErrorToast({ description: "Invalid phone number." });
      });
  }
  return (
    <OverlayRouter key={loadType}>
      <LandingPage
        key={store.countries.length}
        onDiscountSubmit={(values) => {
          onSubmitForm({ discount: true, ...values });
        }}
        contactNumber="09094526878"
        onSubmitForm={onSubmitForm}
        initialFormValues={store.landingProps}
        store={store}
        updateField={store.updateFields}
        isLoading={isLoading}
        countries={countries.map((x) => ({
          label: x.name,
          value: x.name,
          code: x.code2,
        }))}
      />
    </OverlayRouter>
  );
};

export async function getStaticProps({}) {
  let [regions, countries] = await Promise.all([
    serverAdapter.getRegions(),
    serverAdapter.getCountries(),
  ]);
  return {
    props: { regions, countries },
  };
}

export default Home;
