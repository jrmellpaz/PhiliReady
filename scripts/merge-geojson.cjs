const fs = require('fs');
const path = require('path');

if (process.argv.length < 4) {
  console.error("Usage: node merge-geojson.cjs <input-directory> <output-file>");
  process.exit(1);
}

const inputDir = path.resolve(process.argv[2]);
const outputFile = path.resolve(process.argv[3]);

console.log(`Reading GeoJSON files from: ${inputDir}`);

const featureCollection = {
  type: "FeatureCollection",
  features: []
};

let fileCount = 0;

try {
  const files = fs.readdirSync(inputDir);
  
  for (const file of files) {
    if (!file.endsWith('.json') && !file.endsWith('.geojson')) continue;

    const filePath = path.join(inputDir, file);
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Some files might be bare Features, others might be FeatureCollections
      if (parsed.type === "FeatureCollection") {
        featureCollection.features.push(...parsed.features);
      } else if (parsed.type === "Feature") {
        featureCollection.features.push(parsed);
      } else if (parsed.type === "Topology") {
        console.warn(`Skipping TopoJSON file (unsupported by simple merge): ${file}`);
      }
      
      fileCount++;
    } catch (e) {
      console.error(`Error processing file ${file}:`, e.message);
    }
  }

  // Write the combined file
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(featureCollection));
  console.log(`Successfully merged ${fileCount} files into a single FeatureCollection with ${featureCollection.features.length} features.`);
  console.log(`Output saved to: ${outputFile}`);

} catch (err) {
  console.error("Error reading directory:", err);
}
