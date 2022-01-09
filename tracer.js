function setupDatadog() {
    // const tracer = require("dd-trace").init();
    console.log("ENVIRONMENT: ", process.env.IS_DEVELOPMENT);
    console.log("PAYSTACK_KEY: ", process.env.PAYSTACK_KEY);
    console.log("PAYMENT_KIND: ", process.env.PAYMENT_KIND);
    console.log("HOST_ENDPOINT: ", process.env.HOST_ENDPOINT);
    console.log("NOTIFICATION_SERVICE: ", process.env.NOTIFICATION_SERVICE);
    console.log("SCHEDULER_SERVICE: ", process.env.SCHEDULER_SERVICE);
    console.log("PDF_HOST: ", process.env.PDF_HOST);
    console.log("TEST_EMAIL: ", process.env.TEST_EMAIL);
    console.log("TEST_NUMBER: ", process.env.TEST_NUMBER);
    console.log("IS_TEST: ", process.env.IS_TEST);
    console.log("TEST_AGENT_ID: ", process.env.TEST_AGENT_ID);
  }
  function setupLogging() {
    // const { createLogger, format, transports } = require("winston");
  
    // const httpTransportOptions = {
    //   host: "http-intake.logs.datadoghq.com",
    //   path:
    //     "/v1/input/7e1d26cf65746ae3f76c2ddf359ca49c?ddsource=nodejs&service=<APPLICATION_NAME>",
    //   ssl: true
    // };
  
    // const logger = createLogger({
    //   level: "info",
    //   exitOnError: false,
    //   format: format.json(),
    //   transports: [new transports.Http(httpTransportOptions)]
    // });
    // return logger;
  }
  
  setupDatadog();
  setupLogging();
  