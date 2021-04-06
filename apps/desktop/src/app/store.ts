import {configureStore} from "@reduxjs/toolkit";
import {useDispatch} from "react-redux";
import rootReducer from "./reducers/root";
import {DevTools} from "./DevTools";

const store = configureStore({
    reducer: rootReducer,
    enhancers: [DevTools.instrument()]
});

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();

export default store;
