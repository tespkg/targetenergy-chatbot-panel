import { createStore, compose } from "redux";
import reducer from "./reducers";
import { StoreType } from "./types/general-state-types";

export function configureStore(initialState?: StoreType) {
  if (process.env.NODE_ENV === "production") {
    return createStore(reducer, initialState);
  } else {
    let store: any;
    try {
      store = compose(
        // @ts-ignore
        window.__REDUX_DEVTOOLS_EXTENSION__ && // @ts-ignore
          window.__REDUX_DEVTOOLS_EXTENSION__()
      )(createStore)(reducer, initialState);
    } catch (error) {
      store = createStore(reducer, initialState);
    }

    return store;
  }
}

const store = configureStore(undefined);
export const dispatch = store.dispatch.bind(store);
export default store;
