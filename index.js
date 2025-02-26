import { readFile } from "fs/promises";
import { createWriteStream } from "fs";

// Adjustable variables:
const inputFile = "input/inputfilenamehere.geojson"; // geoJSON file
const outputFile = "output/outputfilenamehere.geojson"; // geoJSON file
const tileSizeDegrees = 0.25; // Width & height. Tile will be centered at coordinate of each point in input data
const boundaries = { // Tiles will be clipped if they extend outside this area
    lat: {
        min: -180,
        max: 180
    },
    lon: {
        min: -90,
        max: 90
    }
}

function createSquareTile([xTile, yTile]) {
    let cornerX = xTile - tileSizeDegrees / 2;
    let cornerY = yTile - tileSizeDegrees / 2;
    let tileWidth = tileSizeDegrees;
    let tileHeight = tileSizeDegrees;

    if (cornerX < boundaries.lon.min) {
        tileWidth = tileSizeDegrees - (cornerX - boundaries.lon.min);
        cornerX = boundaries.lon.min;
    }
    if (cornerX + tileWidth > boundaries.lon.max) {
        tileWidth = tileWidth - (cornerX + tileWidth - boundaries.lon.max);
    }
    if (cornerY < boundaries.lat.min) {
        tileHeight = tileSizeDegrees - (cornerY - boundaries.lat.min);
        cornerY = boundaries.lat.min;
    }
    if (cornerY + tileHeight > boundaries.lat.max) {
        tileHeight = tileHeight - (cornerY + tileHeight - boundaries.lat.max);
    }

    return {
        type: "Polygon",
        coordinates: [[
            [cornerX, cornerY],
            [cornerX + tileWidth, cornerY],
            [cornerX + tileWidth, cornerY + tileHeight],
            [cornerX, cornerY + tileHeight],
            [cornerX, cornerY]
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
