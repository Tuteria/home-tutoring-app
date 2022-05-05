// @ts-nocheck
// import App from "next/app";
import ZetaProvider from "@tuteria/shared-lib/src/bootstrap";
import "katex/dist/katex.min.css";
import Head from "next/head";
import React from "react";
import "react-phone-input-2/lib/style.css";
import "keen-slider/keen-slider.min.css";
import "@fontsource/inter/variable.css";

require("react-dom");
if (typeof window !== "undefined") {
  window.React2 = require("react");
  console.log(window.React1 === window.React2);
}
const MyApp = ({ Component, pageProps: others }) => {
  let { seo = {}, ...pageProps } = others;

  return (
    <ZetaProvider>
      <>
        <Head>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta
            name="viewport"
            content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no"
          />
          <meta name="description" content={seo.description || "Description"} />
          <meta
            name="keywords"
            content="Homework and studies,Exam Prep and Revision,General Home Lessons,Learnig,Get a Tutor,Hire a Tutor"
          />

          <title>{seo.title || `Tuteria - Find the Perfect Tutor for your Child`}</title>

          <meta
            property="og:title"
            content={seo.title || "Tuteria - Find the Perfect Tutor for your Child"}
          />
          <meta
            property="og:description"
            content={
              seo.description ||
              "Help your child excel with expert lessons at home or online taught by the very best"
            }
          />
          <meta property="og:image" content={seo.image} />

          <link rel="icon" href="/favicon.ico" />
          {/* <link
            href="/icons/favicon-16x16.png"
            rel="icon"
            type="image/png"
            sizes="16x16"
          />
          <link
            href="/icons/favicon-32x32.png"
            rel="icon"
            type="image/png"
            sizes="32x32"
          /> */}
          {/* <link rel="apple-touch-icon" href="/apple-icon.png"></link> */}
          <meta name="theme-color" content="#317EFB" />
          <div
            dangerouslySetInnerHTML={{
              __html: `
                  <!-- Facebook Pixel Code -->
                  <script>
                    !function(f,b,e,v,n,t,s)
                    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window, document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    fbq('init', '915522721958382');
                    fbq('track', 'PageView');
                  </script>
                  <noscript><img height="1" width="1" style="display:none"
                    src="https://www.facebook.com/tr?id=915522721958382&ev=PageView&noscript=1"
                  /></noscript>
                  <!-- End Facebook Pixel Code -->`,
            }}
          />
        </Head>
        {/* <DefaultSeo {...seo} /> */}
        <Component {...pageProps} />
      </>
    </ZetaProvider>
    // <Component {...pageProps} />
  );
};

// MyApp.getInitialProps = async appContext => {
//   // calls page's `getInitialProps` and fills `appProps.pageProps`
//   const appProps = await App.getInitialProps(appContext);
//   console.log(appProps.pageProps);
//   return { ...appProps };
// };

export default MyApp;
