import http from "http";

async function runSSETest() {
  console.log("=== Testing SSE Endpoint (/api/events) ===");

  let receivedConnected = false;
  let receivedDetection = false;

  const req = http.request(
    "http://localhost:5000/api/events",
    {
      headers: {
        Accept: "text/event-stream",
      },
    },
    (res) => {
      console.log(`SSE Response HTTP Status: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers["content-type"]}`);

      res.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        console.log(`[SSE Stream Data]:\n${text.trim()}`);
        if (text.includes("event: connected")) {
          receivedConnected = true;
        }
        if (text.includes("event: detection") || text.includes("MP0AA8123")) {
          receivedDetection = true;
        }
      });
    }
  );

  req.on("error", (err) => {
    console.error("SSE request error:", err.message);
  });

  req.end();

  // Wait 1 second for SSE connection to stabilize, then trigger an ingest
  await new Promise((r) => setTimeout(r, 1000));

  console.log("Triggering test detection POST /api/detections...");
  const postData = JSON.stringify({
    plate: "MP0AA8123",
    cameraId: "CAM-001",
    confidence: 0.96,
    trackId: 10,
  });

  const postReq = http.request(
    "http://localhost:5000/api/detections",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    },
    (postRes) => {
      let body = "";
      postRes.on("data", (d) => (body += d));
      postRes.on("end", () => {
        console.log(`Detection POST response status: ${postRes.statusCode}`);
      });
    }
  );
  postReq.write(postData);
  postReq.end();

  // Wait 2 seconds for event arrival
  await new Promise((r) => setTimeout(r, 2000));

  req.destroy();

  console.log("\n--- TEST SUMMARY ---");
  console.log(`Connected event received: ${receivedConnected ? "PASSED" : "FAILED"}`);
  console.log(`Detection event broadcast received: ${receivedDetection ? "PASSED" : "FAILED"}`);

  if (receivedConnected && receivedDetection) {
    console.log(">>> SSE REAL-TIME BROADCAST VERIFICATION: SUCCESS <<<");
    process.exit(0);
  } else {
    console.log(">>> SSE VERIFICATION: FAILED <<<");
    process.exit(1);
  }
}

runSSETest().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
