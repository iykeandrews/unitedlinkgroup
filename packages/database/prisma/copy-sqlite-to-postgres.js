// Copy only into an empty PostgreSQL database. Preserve SQLite and verify every source field.
const { spawnSync } = require('node:child_process');
const { PrismaClient, Prisma } = require('./client');
const path = require('node:path');
const fs = require('node:fs');
async function main() {
  const sourcePath = process.env.SQLITE_SOURCE_PATH;
  const destination = process.env.DATABASE_URL;
  if (!sourcePath || !path.isAbsolute(sourcePath) || !fs.existsSync(sourcePath)) throw new Error('SQLITE_SOURCE_PATH must identify an existing absolute path.');
  const url = new URL(destination);
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) throw new Error('Destination must be PostgreSQL.');
  const result = spawnSync('python3', ['-c', `import sqlite3,json,sys,pathlib
c=sqlite3.connect(pathlib.Path(sys.argv[1]).as_uri()+'?mode=ro',uri=True)
c.row_factory=sqlite3.Row
assert c.execute('pragma integrity_check').fetchone()[0]=='ok'
assert not c.execute('pragma foreign_key_check').fetchall()
tables=[r[0] for r in c.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name != '_prisma_migrations'")]
print(json.dumps({t:[dict(r) for r in c.execute('select * from "'+t+'"')] for t in tables}))`, sourcePath], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  if (result.status !== 0) throw new Error('Source integrity/export failed: '+result.stderr);
  const source = JSON.parse(result.stdout);
  const models = Prisma.dmmf.datamodel.models;
  const byName = new Map(models.map(m=>[m.name,m]));
  for (const [table, rows] of Object.entries(source)) {
    if (rows.length && !byName.has(table)) throw new Error(`Nonempty source table ${table} has no target model.`);
    const fields = new Set(byName.get(table)?.fields.filter(f=>f.kind!=='object').map(f=>f.name));
    for (const row of rows) for (const key of Object.keys(row)) if (!fields.has(key)) throw new Error(`Unmapped source column ${table}.${key}; refusing data loss.`);
  }
  const ordered=[]; const remaining=[...models];
  while(remaining.length){
    const i=remaining.findIndex(m=>m.fields.filter(f=>f.relationFromFields?.length && f.isRequired && f.type!==m.name).every(f=>ordered.some(p=>p.name===f.type)));
    if(i<0) throw new Error('Cross-model dependency cycle requires a reviewed migration.');
    ordered.push(remaining.splice(i,1)[0]);
  }
  const key = m => m.name[0].toLowerCase()+m.name.slice(1);
  const normalized=(value, field)=> {
    if(value===null) return null;
    if(field.type==='DateTime') { const d=new Date(typeof value==='number'?value:value); if(!Number.isFinite(d.getTime()))throw new Error(`Invalid date in ${field.name}`);return d; }
    if(field.type==='Boolean') { if (![0,1,false,true].includes(value))throw new Error('Invalid boolean');return Boolean(value); }
    return value;
  };
  const pg=new PrismaClient({datasources:{db:{url:destination}}});
  try {
    await pg.$transaction(async tx=> {
      for(const m of ordered) if(await tx[key(m)].count()) throw new Error(`Destination ${m.name} is not empty. Copy refused; nothing overwritten.`);
      const deferred=[];let total=0;
      for(const m of ordered){
        const fields=m.fields.filter(f=>f.kind!=='object');
        const self=m.fields.filter(f=>f.relationFromFields?.length && (!f.isRequired || f.type===m.name)).flatMap(f=>f.relationFromFields);
        const rows=(source[m.name]||[]).map(row=>Object.fromEntries(fields.filter(f=>Object.hasOwn(row,f.name)).map(f=>[f.name,normalized(row[f.name],f)])));
        for(const row of rows) for(const field of self) if(row[field]!=null){
          if(fields.find(f=>f.name===field).isRequired)throw new Error('Required self-relation needs reviewed migration.');
          deferred.push({delegate:key(m),id:row.id,field,value:row[field],updatedAt:row.updatedAt});row[field]=null;
        }
        for(let i=0;i<rows.length;i+=100)await tx[key(m)].createMany({data:rows.slice(i,i+100)});
        total+=rows.length;
      }
      for(const d of deferred)await tx[d.delegate].update({where:{id:d.id},data:{[d.field]:d.value,...(d.updatedAt?{updatedAt:d.updatedAt}:{})}});
      for(const m of ordered){
        const rows=source[m.name]||[];const saved=await tx[key(m)].findMany();
        if(saved.length!==rows.length)throw new Error(`Count mismatch: ${m.name}`);
        const index=new Map(saved.map(r=>[r.id,r]));
        for(const row of rows){const actual=index.get(row.id); if(!actual)throw new Error(`Missing record: ${m.name}`);
          for(const field of m.fields.filter(f=>f.kind!=='object'&&Object.hasOwn(row,f.name))){
            const expected=normalized(row[field.name],field);
            if(JSON.stringify(actual[field.name])!==JSON.stringify(expected))throw new Error(`Value mismatch: ${m.name}.${field.name}`);
          }
        }
      }
      console.log(`Verified ${total} records across ${ordered.length} models. All source columns match; copy committed atomically.`);
    },{timeout:120000,maxWait:10000,isolationLevel:'Serializable'});
  } finally { await pg.$disconnect(); }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
