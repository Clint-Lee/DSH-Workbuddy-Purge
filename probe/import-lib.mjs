const m = await import("../lib/index.js")
console.log("exports:", Object.keys(m).join(", ").slice(0, 400))
