export let HOST = process.env.HOST_ENDPOINT || "http://backup.tuteria.com:8000";

//Tutor api service calls
export async function getSelectedTutorSearchData(params, request_slug) {
  let response = await fetch(`${HOST}/new-flow/search/${request_slug}`, {
    method: "POST",
    body: JSON.stringify(params),
    headers: { "Content-type": "application/json" },
  });
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Error from backend server");
}

export async function getNewRequestDetail(
  slug,
  withAgent = true,
  as_parent = false
) {
  return await getParentRequestBySlug(slug, withAgent, as_parent);
}

export async function getParentRequestBySlug(
  slug,
  withAgent = false,
  as_parent = false
) {
  let url = `update-home-tutoring-request`;
  if (withAgent) {
    url = `home-tutoring-request`;
  }
  let response = await fetch(
    `${HOST}/new-flow/${url}/${slug}${as_parent ? `?as_parent=true` : ""}`
  );
  if (response.status < 400) {
    let data = await response.json();
    return data.data;
  }
  throw new Error("Not found");
}
