import { useCallback, useEffect, useState } from "react";

export function useHashRoute() {
  const getHash = () => window.location.hash.slice(1) || "/";
  const [route, setRoute] = useState(getHash);

  useEffect(() => {
    const onHashChange = () => setRoute(getHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return { route, navigate };
}
