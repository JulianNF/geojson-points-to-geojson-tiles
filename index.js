import { readFile } from "fs/promises";
import { createWriteStream } from "fs";

// Adjustable variables:
const inputFile = "input/inputfilenamehere.geojson"; // geoJSON file
const outputFile = "output/outputfilenamehere.geojson"; // geoJSON file
const tileSizeDegrees = 0.25; // Width & height. Tile will be centered at coordinate of each point in input data
const boundaries = { // Tiles will be clipped if they extend outside this area
    lat: {
        min: -90,
        max: 90
    },
    lon: {
        min: -180,
        max: 180
    }
}

function createSquareTile([longitude, latitude]) {
    // Define bottom-left corner of tile:
    let cornerLon = longitude - tileSizeDegrees / 2;
    let cornerLat = latitude - tileSizeDegrees / 2;
    let tileWidth = tileSizeDegrees;
    let tileHeight = tileSizeDegrees;

    if (cornerLon < boundaries.lon.min) {
        tileWidth = tileSizeDegrees - (cornerLon - boundaries.lon.min);
        cornerLon = boundaries.lon.min;
    }
    if (cornerLon + tileWidth > boundaries.lon.max) {
        tileWidth = tileWidth - (cornerLon + tileWidth - boundaries.lon.max);
    }
    if (cornerLat < boundaries.lat.min) {
        tileHeight = tileSizeDegrees - (cornerLat - boundaries.lat.min);
        cornerLat = boundaries.lat.min;
    }
    if (cornerLat + tileHeight > boundaries.lat.max) {
        tileHeight = tileHeight - (cornerLat + tileHeight - boundaries.lat.max);
    }

    return {
        type: "Polygon",
        coordinates: [[
            [cornerLon, cornerLat],
            [cornerLon + tileWidth, cornerLat],
            [cornerLon + tileWidth, cornerLat + tileHeight],
            [cornerLon, cornerLat + tileHeight],
            [cornerLon, cornerLat]
        ]]
    }
};

function convertPointsToTileFeatures(geojson) {
    // NB: Use set to ignore any duplicates in the original data:
    const tileSet = new Set();
    geojson.features.forEach(feature => tileSet.add(JSON.stringify(feature)));

    return Array.from(tileSet).map(featureString => {
        const feature = JSON.parse(featureString);
        return {
            type: "Feature",
            geometry: createSquareTile(feature.geometry.coordinates),
            properties: feature.properties
        };
    });
};

async function processGeoJSON(inputFile, outputFile) {
    try {
        const data = await readFile(inputFile, "utf8");
        const geojsonData = JSON.parse(data);

        const tileFeatures = convertPointsToTileFeatures(geojsonData);

        const writeStream = createWriteStream(outputFile);
        writeStream.write('{ "type": "FeatureCollection", "features": [\n');

        let firstFeature = true;
        tileFeatures.forEach(feature => {
            if (!firstFeature) writeStream.write(",\n");
            writeStream.write(JSON.stringify(feature));
            firstFeature = false;
        })
        writeStream.write("\n]}\n");
        writeStream.end();

        console.log(`Tiles saved to ${outputFile}`);
    } catch (error) {
        console.error("Error processing GeoJSON:", error);
    }
};

processGeoJSON(inputFile, outputFile);
