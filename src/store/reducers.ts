import { handleActions } from "redux-actions";
import update from "immutability-helper";
import * as Actions from "./actions";
import { StoreType } from "./types/general-state-types";

const initialState: StoreType = {
  traces: [],
};

export default handleActions<StoreType, any>(
  {
    [Actions.AddTrace.toString()](state = initialState, { payload }: ReturnType<typeof Actions.AddTrace>) {
      const { trace } = payload;

      const newTraces = [...state.traces, trace];
      return update(state, {
        traces: {
          $set: newTraces,
        },
      });
    },
  },
  initialState
);
