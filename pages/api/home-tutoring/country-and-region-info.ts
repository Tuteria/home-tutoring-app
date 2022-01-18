import { NextApiRequest, NextApiResponse } from "next";
import serverAdapter from "../../../server_utils/server";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method == "GET") {
    try {
      let result: any = await serverAdapter.getCountries();
      res.status(200).json({
        data: result,
        status: true
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ status: false, error });
    }
  } else {
    res.status(405).json({ msg: "Not Allowed Method" });
  }
};
