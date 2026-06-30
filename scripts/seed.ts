import { loadLocalEnv } from "./load-local-env.js";
loadLocalEnv();
import { ensureDefaultGroup } from "../src/server/groups.js";
import { getPool } from "../src/server/db.js";

const group = await ensureDefaultGroup();
console.log(JSON.stringify({ seeded: true, groupId: group.id, displayName: group.display_name }, null, 2));
await getPool().end();
