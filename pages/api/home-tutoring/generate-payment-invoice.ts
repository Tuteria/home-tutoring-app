import { defaultView } from '../../../middleware';
import serverAdapter from "../../../server_utils/server";

export default defaultView(async (req) => {
    let result = await serverAdapter.generatePaymentInvoice(req.body);
    if (!result) {
        throw "Error creating invoice";
    }
    return result
}, { method: "POST" });

