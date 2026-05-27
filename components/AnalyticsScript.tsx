import Script from "next/script";

const COUNT_URL = "https://frontier-cbir.goatcounter.com/count";

/** Load the script for GoatCounter analytics.
 */
export default function AnalyticsScript() {
  return (
    <Script
      src="//gc.zgo.at/count.js"
      data-goatcounter={COUNT_URL}
      async
      strategy="afterInteractive"
    />
  );
}
