import { useWindowDimensions } from "react-native";
import { breakpoints } from "../theme/tokens";

export type Device = "mobile" | "tablet" | "desktop";

/** Hook responsive partagé web + mobile. */
export function useResponsive() {
  const { width } = useWindowDimensions();
  const device: Device =
    width >= breakpoints.desktop
      ? "desktop"
      : width >= breakpoints.tablet
        ? "tablet"
        : "mobile";
  return {
    width,
    device,
    isMobile: device === "mobile",
    isTablet: device === "tablet",
    isDesktop: device === "desktop",
    /** Nombre de colonnes suggéré pour une grille de cartes. */
    columns: device === "desktop" ? 3 : device === "tablet" ? 2 : 1,
  };
}
