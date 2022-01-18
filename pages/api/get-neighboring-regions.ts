import { defaultView } from "../../middleware";
import { getNeighboringArea } from "../../server_utils/hostService";

export default defaultView(async (req) => {
  const data = await getNeighboringArea(req.query.region);
  return data;
}, { method: 'GET' });

