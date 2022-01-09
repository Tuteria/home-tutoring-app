import HomePage from "@tuteria/shared-lib/src/store/pages/Home";
import { TuteriaStore } from "@tuteria/shared-lib/src/store/_store";
import React from "react";
import clientAdapter from "../server_utils/client";
import serverAdapter from "../server_utils/server";
import { getQueryValues, usePrefetchHook } from "../server_utils/util";

const store = TuteriaStore.create(
  {},
  {
    adapter: clientAdapter,
  }
);
type HomeProps = {
  heading: string;
  mainProduct: {
    id: string;
    name: string;
    currency: string;
    price: number;
    description: string;
    imageUrl: string;
  };
  products: Array<{
    id: string;
    name: string;
    currency: string;
    featured: boolean;
    price: number;
    salePrice?: undefined;
  }>;
};
function Index(props: HomeProps) {
  const { navigate, onError } = usePrefetchHook({
    routes: ["/[slug]", "/checkout"],
  });
  
  React.useEffect(() => {
    store.initialize({
      cartItems: clientAdapter.loadCart(),
      products: [...props.products, props.mainProduct],
    });
    throw new Error("Error form sentry")
  }, []);
  return (
    <HomePage
      store={store}
      heading={props.heading}
      mainProduct={props.mainProduct}
      products={props.products.filter((o) => !o.featured)}
      toCheckoutPage={(userId) => {
        let o:any = window;
        if (o.fbq) {
          o.fbq("track", "InitiateCheckout", {
            currency: store.currency,
            value: store.totalCartAmount,
            num_items: store.cartItems.length,
          });
        }
        const { coupon = "" } = getQueryValues();
        navigate(`/checkout?userId=${userId}&coupon=${coupon}`);
      }}
      toFullDetails={(item) => {
        return `/${item?.id}`;
      }}
    />
  );
}

export async function getStaticProps() {
  const result = await serverAdapter.getStoreInfo();
  return {
    props: {
      ...result,
      seo: {
        title: "Tuteria IELTS Band 8 Academy Store",
        description:
          "Taught by expert Nigerian IELTS examiners, we provide IELTS Video Course and Materials to Help Students get a Band 8.0 in their IELTS Exams Guaranteed",
        image: result.mainProduct.imageUrl,
      },
    },
    revalidate: 20 * 60,
  };
}

export default Index;
