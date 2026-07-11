import { createContext, useContext } from "react";
import type { SectionKey } from "./sections/registry";

/** Lets any section jump to another section (e.g. Dashboard → Tasks). */
export const SectionNavContext = createContext<(k: SectionKey) => void>(() => {});
export const useSectionNav = () => useContext(SectionNavContext);
