import {Migration} from "../migration-manager";
import {Knex} from "knex";

const migration: Migration = {
    async up(knex: Knex) {
        await knex.schema.createTable("albumArt", builder => {
            builder.string("hash").primary();

            builder.string("avgColour");
            builder.string("mimeType");
            builder.binary("source");
        });

        await knex.schema.createTable("artists", builder => {
            builder.increments();
            builder.timestamp("lastUpdated");

            // artist's name
            builder.string("name");
            builder.string("sortableName").unique().index();
        });

        await knex.schema.createTable("albums", builder => {
            builder.increments();
            builder.timestamp("lastUpdated");

            builder.integer("artistId").references("artists.id");

            // name of the album
            builder.string("name");
            builder.string("sortableName").index();

            builder.unique(["artistId", "sortableName"]);
        });

        await knex.schema.createTable("tracks", builder => {
            builder.increments();
            builder.timestamp("lastUpdated");

            builder.integer("albumId").references("albums.id").index();
            builder
                .string("albumArtHash")
                .references("albumArt.hash")
                .nullable();

            builder.string("name");
            builder.string("sortableName");

            builder.date("releaseDate").nullable();
            builder.float("duration");
            builder.integer("trackNo").nullable();

            builder.string("audioSrcPath").unique().index();
        });
    },
    async down(knex: Knex) {
        await knex.schema.dropTable("tracks");
        await knex.schema.dropTable("albums");
        await knex.schema.dropTable("artists");
        await knex.schema.dropTable("albumArt");
    }
};

export default migration;
