# ![Logo](./logo-small.png) Muzik

![Screenshot of the queue route](screenshot.png)

Muzik is an offline music playing app. It currently supports the features most people need out of a music player (i.e. it can play music and has shuffle and repeat modes), but also comes with a clean UI to boot.

There are more features that are planned or in the pipeline:

- Playlists (user-created and automatically generated)
- Rating
- Full screen "kiosk mode"
- Download and play music from Youtube, Soundcloud etc

## Building

After you've cloned the app, run `pnpm i` in the root directory to install the dependencies, then `pnpm run r:build`, which will build the app and output the installers in `apps/desktop/dist`.

Note that currently cross-platform builds are not supported, due to some native dependencies.

## Development

The project is structured as a monorepo, with its dependencies in the `libs` directory and the actual app in `apps`. The only library inside `config` is configuration for Rollup, which isn't used any more.

To start developing, you need to run two commands in different terminals:

In the root directory, run:

```sh
pnpm run r:build:watch
```

This will build all the dependencies that are used by the app, and watches for changes to rebuild.

Inside `apps/desktop`, run:

```sh
pnpm start
```

This will start the dev mode of the application. Note that dev mode does not currently support hot reloading - if you make changes to renderer code, you will need to refresh after it builds, and if you change code that runs on the main process, you will need to stop and restart the application.

## Why?
I began this project because I got fed up with Spotify. There's a couple major problems with their apps that I can see:

- Bad support for local files
- Songs get removed or go unavailable
- The latest UI redesign made album art be blurry

On Windows I found a piece of software called [Dopamine](https://github.com/digimezzo/dopamine-windows), which, although it had a fair few bugs, was pretty much what I wanted, but it's a Windows-only app, and I use Linux as my daily driver, so it wouldn't work for me.

It turns out the creators of Dopamine are [rewriting it as an Electron app](https://github.com/digimezzo/dopamine) that is multiplatform, and it is in an early alpha state, so I tried downloading and building it (as it doesn't have any releases yet), but found out that the build doesn't work, at least on my PC.

I searched around for a different, Linux compatible, music player app, and found one that I liked and that worked decently well - [Museeks](https://github.com/martpie/museeks). I used this for a while, but found that it was too simple for me.

I was starting to realise that I also wanted something that I could hack, and add features that I needed, in code that I own and know my way around, so I started work on Muzik.

Originally I thought it would take probably two days to get to a working state, maybe a week maximum, but it turns out music players are actually complicated little pieces of software! (Or, software in general is complicated.) So here it is.

Ironically, I've mostly gone back to using Spotify as my main music player, as it has features that aren't possible for an offline player to do (i.e. recommendations), and it supports playlists which Muzik doesn't, but I hope that soon Muzik will be at a state where I can use it personally - after all, why should I expect other people to use an app that I myself don't?
