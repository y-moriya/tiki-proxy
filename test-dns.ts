import { Hono } from "npm:hono";
const app = new Hono();
app.get("/dns", async (c) => {
  const dnsRecords = await Deno.resolveDns("fire-emblem-matome.com", "A");
  return c.json(dnsRecords);
});
Deno.serve({ port: 8000 }, app.fetch);
