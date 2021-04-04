import {host} from "\0autoreload:configuration";
import EventSourcePolyfill from "eventsource";

export default cb => {
    if (process.env.NODE_ENV !== "production") {
        console.log("Listening for updates from", host, "...");

        const events = new EventSourcePolyfill(host);

        events.addEventListener("trigger", () => {
            cb();
        });

        events.addEventListener("hello", () => {
            console.log("Connected to autoreload");
        });
    }
};
