import { defaultView } from '../../../middleware';
import serverAdapter from "../../../server_utils/server";

export default defaultView(async (req) => {
  const data = await serverAdapter.getCountries();
  return data;
}, { method: "GET" });
