#!/bin/bash

mv .webpack build

# electron-forge outputs assets to the wrong directory
cd build/renderer || exit
find . -mindepth 1 -maxdepth 1 ! -name main_window -exec mv -t main_window/ {} +
cd ../..
