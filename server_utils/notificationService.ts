const NOTIFICATION_SERVICE =
    process.env.NOTIFICATION_SERVICE || "http://email-service.tuteria.com:5000";

export const templates = {
    complete_request: "complete_request",
    request_successful: "request_successful"
};

const constructBody = ({
    template,
    from = "Tuteria <automated@tuteria.com>",
    to,
    context,
}) => {
    let result = {
        backend: "postmark_backend",
        template: template,
        from_mail: from,
        to: [to],
        context: [context],
    };
    return result;
};

export async function sendEmailNotification(payload) {
    const { template, to, context } = payload
    const dataToSend = constructBody({ template, to, context })
    const response = await fetch(`${NOTIFICATION_SERVICE}/send_message/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dataToSend),
    });
    console.log(dataToSend);
    const result = await response.json();
    return result;
}
