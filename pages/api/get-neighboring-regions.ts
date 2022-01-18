import { NextApiRequest, NextApiResponse } from 'next'
import { getNeighboringArea } from "../../server_utils/hostService";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method == "GET") {
    let data = await getNeighboringArea(req.query.region);
    try {
      res.status(200).json({
        status: true,
        data
      });
    } catch (error) {
      res.status(400).json({ error });
    }
  } else {
    res.status(405).json({ msg: "Not Allowed Method" });
  }
};
