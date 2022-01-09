import { NextApiRequest, NextApiResponse } from "next";
export const defaultView = (
  handler: (
    _req?: NextApiRequest,
    _res?: NextApiResponse,
    method?: string
  ) => Promise<any>,
  options: {
    force_verify?: boolean;
    method?: string;
    includeToken?: string;
    afterResponse?: any;
  } = { method: "POST" }
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === options.method) {
      try {
        let response = await handler(req, res);
        res.json({ status: true, data: response });
        if (options.afterResponse) {
          await options.afterResponse();
        }
      } catch (error) {
        console.log(error);
        res.status(400).json({ status: false, error });
      }
    } else {
      res.status(405).json({ msg: "Not Allowed Method" });
    }
  };
};
