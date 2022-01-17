import { useEffect } from "react";
import { useRouter } from "next/router";
import { useToast } from "@chakra-ui/react";
import getConfig from "next/config";
import { format } from "url";

const { publicRuntimeConfig } = getConfig() || {};

function push(router, url, shallow = false, same = true) {
  let newUrl = `${publicRuntimeConfig.basePath || ""}${format(url)}`;
  const as = same ? newUrl : undefined;
  router.push(newUrl, as, { shallow });
}

export const usePrefetchHook = ({
  routes = [],
  base = "",
  key = "",
  keyFunc = (router) => "",
}) => {
  const toast = useToast();
  let rootBase = key;
  let router = useRouter();
  if (keyFunc) {
    rootBase = keyFunc(router);
  }
  useEffect(() => {
    routes.forEach((route) => {
      router.prefetch(`${base}${rootBase}${route}`);
    });
  }, [routes.length]);
  const navigate = (path, same = true) => {
    push(router, `${base}${rootBase}${path}`, true, same);
  };
  function onError(error: any, title = "An error occured") {
    if (error === "Invalid Credentials") {
      const { pathname, search } = window.location;
      navigate(`/login?next=${`${pathname}${search}`}`);
    } else {
      toast({
        title,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
    }
  }

  return { navigate, router, onError, toast };
};

export async function verifyPaymentFromPaystack({ url, skip = false }) {
  let response = await fetch(url);
  if (response.status < 500) {
    let result = await response.json();
    return result;
  }
  return { status: false, msg: "An error from server" };
}

export function getQueryValues(): {[key: string]: string} {
  if (typeof window !== "undefined") {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    let result = {};
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      let p = decodeURIComponent(pair[0]);
      let q = decodeURIComponent(pair[1]);
      result[p] = q;
    }
    return result;
  }
  return {};
}

export function useToastHelper() {
  const toast = useToast();

  function showSuccessToast({ title, description }) {
    toast({
      position: "bottom",
      title,
      description,
      status: "success",
      duration: 9000,
      isClosable: true
    });
  }
  function showErrorToast({ description }) {
    toast({
      position: "bottom",
      title: "Error",
      description,
      status: "error",
      duration: 9000,
      isClosable: true
    });
  }
  return { showSuccessToast, showErrorToast };
}