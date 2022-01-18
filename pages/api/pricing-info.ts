import { getClientPricingInformation } from "@tuteria/tuteria-data/src";
import { defaultView } from "../../middleware";

export default defaultView(
  async (req) => {
    return getClientPricingInformation();
  },
  { method: "GET" }
);
