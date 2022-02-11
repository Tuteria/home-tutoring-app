import serverAdapter from "../../../server_utils/server";
import { defaultView } from "../../../middleware";


export default defaultView(
    async (req) => {
        let { paystackUrl, paymentInfo, kind = "payment" } = req.body;
        let result = await serverAdapter.verifyPayment({
            paystackUrl,
            paymentInfo,
            kind
        });
        return result
    },
    {
        method: "POST", afterResponse: async () => {

            // await serverAdapter.notifyTutorOnPaymentAction(paymentInfo.slug, kind);
        }
    }
);
