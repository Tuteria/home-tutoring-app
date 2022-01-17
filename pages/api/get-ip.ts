import { NextApiRequest, NextApiResponse } from 'next'
import serverAdapter from "../../server_utils/server";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method == "GET") {
    let data = await serverAdapter.getIpFromRequest(req);
    try {
      res.status(200).json({
        data
      });
    } catch (error) {
      res.status(400).json({ error });
    }
  } else {
    res.status(405).json({ msg: "Not Allowed Method" });
  }
};
