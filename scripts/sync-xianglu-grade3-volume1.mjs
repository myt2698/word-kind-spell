if (!process.argv.includes("--grade3")) process.argv.push("--grade3");

await import("./sync-xianglu-grade4-volume1.mjs");
