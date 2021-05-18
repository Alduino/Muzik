import {configureStore} from "@reduxjs/toolkit";
import {DevTools} from "./DevTools";
import rootReducer from "./reducers/root";

const store = configureStore({
    reducer: rootReducer,
    enhancers: [DevTools.instrument()]
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;

export default store;
