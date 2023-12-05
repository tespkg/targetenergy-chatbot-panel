import { StoreType } from "./types/general-state-types";

export const getAllTraces = (state: StoreType) => {
  return state.traces;
};

export const getInfoPanelMessageId = (state: StoreType) => {
  return state.infoPanelMessageId;
};

export const getInfoPanelTraces = (state: StoreType) => {
  const messageId = getInfoPanelMessageId(state);
  if (messageId) {
    const allTraces = getAllTraces(state);
    return allTraces.filter(({ parentId }) => parentId === messageId);
  } else {
    return [];
  }
};
