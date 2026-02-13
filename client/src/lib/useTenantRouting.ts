import { useEffect } from "react";
import { useLocation } from "wouter";

export function useDefaultRoute(defaultPath: string) {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (location === "/") setLocation(defaultPath);
  }, [location, setLocation, defaultPath]);
}
