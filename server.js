import express from "express";
import neo4j from "neo4j-driver";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Variables de entorno para Render
const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const pass = process.env.NEO4J_PASS;

const driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));

// ===============================
//  HELPER: Ejecutar consultas
// ===============================
async function runQuery(query) {
  const session = driver.session();
  try {
    const result = await session.run(query);
    return result.records;
  } finally {
    await session.close();
  }
}

// ===============================
//  ENDPOINTS
// ===============================

// 1. Mostrar todas las transacciones
app.get("/transacciones", async (req, res) => {
  const query = `
    MATCH (o:Cuenta)-[t:TRANSFIERE]->(d:Cuenta)
    RETURN o.id AS origen, d.id AS destino, t.monto AS monto, t.fecha AS fecha
  `;

  const records = await runQuery(query);
  res.json(records.map(r => r.toObject()));
});

// 2. Detección simple (paths de 3 a 5 saltos)
app.get("/sospechosas", async (req, res) => {
  const query = `
    MATCH p = (c1:Cuenta)-[:TRANSFIERE*3..5]->(cN:Cuenta)
    RETURN p LIMIT 10
  `;

  const records = await runQuery(query);
  res.json(records.map(r => r.toObject()));
});

// 3. PageRank
app.get("/centralidad", async (req, res) => {
  const query = `
    CALL gds.pageRank.stream('amlGraph')
    YIELD nodeId, score
    RETURN gds.util.asNode(nodeId).id AS cuenta, score
    ORDER BY score DESC
  `;

  const records = await runQuery(query);
  res.json(records.map(r => r.toObject()));
});

// =================================
app.get("/", (req, res) => res.send("AML Backend OK"));
app.listen(3000, () => console.log("Servidor arrancó en puerto 3000"));
