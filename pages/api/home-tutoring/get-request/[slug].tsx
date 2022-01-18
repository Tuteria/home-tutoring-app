import { NextApiRequest, NextApiResponse } from "next";
import { NextApiRequestQuery } from "next/dist/next-server/server/api-utils";
import serverAdapter from "../../../../server_utils/server";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method == "GET") {
    let { slug }: NextApiRequestQuery = req.query;
    let data = await serverAdapter.getRequestInfo(slug as string, true, true);
    try {
      res.status(200).json({
        status: true,
        data,
      });
    } catch (error) {
      res.status(400).json({ error });
    }
  } else {
    res.status(405).json({ msg: "Not Allowed Method" });
  }
};
