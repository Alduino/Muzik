-- CreateTable
CREATE TABLE "Artwork" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "avgColour" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ImageSource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "path" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "artworkId" INTEGER,
    CONSTRAINT "ImageSource_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "sortableName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Album" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "albumArtist" TEXT NOT NULL,
    "sortableAlbumArtist" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortableName" TEXT NOT NULL,
    "trackCount" INTEGER
);

-- CreateTable
CREATE TABLE "Track" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "hash" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "sortableName" TEXT NOT NULL,
    "releaseYear" INTEGER,
    "trackNumber" INTEGER,
    "publicArtworkUrl" TEXT
);

-- CreateTable
CREATE TABLE "AudioSource" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bitrate" INTEGER NOT NULL,
    "sampleRate" INTEGER NOT NULL,
    "bitsPerSample" INTEGER NOT NULL,
    "lyricsId" INTEGER,
    "duration" REAL NOT NULL,
    "embeddedImageSourceId" INTEGER,
    "trackId" INTEGER,
    CONSTRAINT "AudioSource_lyricsId_fkey" FOREIGN KEY ("lyricsId") REFERENCES "Lyrics" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AudioSource_embeddedImageSourceId_fkey" FOREIGN KEY ("embeddedImageSourceId") REFERENCES "ImageSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AudioSource_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lyrics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "path" TEXT NOT NULL,
    "staticLyrics" TEXT,
    "timedLines" TEXT
);

-- CreateTable
CREATE TABLE "_ArtworkToTrack" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ArtworkToTrack_A_fkey" FOREIGN KEY ("A") REFERENCES "Artwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ArtworkToTrack_B_fkey" FOREIGN KEY ("B") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ArtistToTrack" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ArtistToTrack_A_fkey" FOREIGN KEY ("A") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ArtistToTrack_B_fkey" FOREIGN KEY ("B") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AlbumToTrack" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_AlbumToTrack_A_fkey" FOREIGN KEY ("A") REFERENCES "Album" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AlbumToTrack_B_fkey" FOREIGN KEY ("B") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AlbumToArtist" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_AlbumToArtist_A_fkey" FOREIGN KEY ("A") REFERENCES "Album" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AlbumToArtist_B_fkey" FOREIGN KEY ("B") REFERENCES "Artist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Artwork_fingerprint_key" ON "Artwork"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "ImageSource_path_key" ON "ImageSource"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_sortableName_key" ON "Artist"("sortableName");

-- CreateIndex
CREATE UNIQUE INDEX "Album_sortableName_sortableAlbumArtist_key" ON "Album"("sortableName", "sortableAlbumArtist");

-- CreateIndex
CREATE UNIQUE INDEX "Track_hash_key" ON "Track"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "AudioSource_path_key" ON "AudioSource"("path");

-- CreateIndex
CREATE UNIQUE INDEX "AudioSource_embeddedImageSourceId_key" ON "AudioSource"("embeddedImageSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Lyrics_path_key" ON "Lyrics"("path");

-- CreateIndex
CREATE UNIQUE INDEX "_ArtworkToTrack_AB_unique" ON "_ArtworkToTrack"("A", "B");

-- CreateIndex
CREATE INDEX "_ArtworkToTrack_B_index" ON "_ArtworkToTrack"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ArtistToTrack_AB_unique" ON "_ArtistToTrack"("A", "B");

-- CreateIndex
CREATE INDEX "_ArtistToTrack_B_index" ON "_ArtistToTrack"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AlbumToTrack_AB_unique" ON "_AlbumToTrack"("A", "B");

-- CreateIndex
CREATE INDEX "_AlbumToTrack_B_index" ON "_AlbumToTrack"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AlbumToArtist_AB_unique" ON "_AlbumToArtist"("A", "B");

-- CreateIndex
CREATE INDEX "_AlbumToArtist_B_index" ON "_AlbumToArtist"("B");
