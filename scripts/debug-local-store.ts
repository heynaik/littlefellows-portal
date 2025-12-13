import { getStories } from "../src/lib/server/localStore";

console.log("Reading Local Stories...");
const stories = getStories();
console.log("Count:", stories.length);
const found = stories.find((s: any) => s.id === "local-1765597972337");
if (found) {
    console.log("Found target story:", found.title);
} else {
    console.error("Target story NOT found in localStore.");
}
console.log("CWD:", process.cwd());
