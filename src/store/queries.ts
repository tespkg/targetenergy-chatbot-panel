import { StoreType } from "./types/general-state-types";

export const getTraces = (state: StoreType) => {
  return state.traces;
};
