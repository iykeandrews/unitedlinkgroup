// This verifier uses only read operations, with PostgreSQL read-only transaction enforcement.
const {spawnSync}=require('node:child_process');
const {PrismaClient,Prisma}=require('./client');
async function main(){
 const result=spawnSync('python3',['-c',`import sqlite3,json,sys,pathlib
c=sqlite3.connect(pathlib.Path(sys.argv[1]).as_uri()+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
assert c.execute('pragma integrity_check').fetchone()[0]=='ok'
tables=[r[0] for r in c.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name != '_prisma_migrations'")]
print(json.dumps({t:[dict(r) for r in c.execute('select * from "'+t+'"')] for t in tables}))`,process.env.SQLITE_SOURCE_PATH],{encoding:'utf8',maxBuffer:128*1024*1024});
 if(result.status!==0)throw Error('Read-only source export failed.');
 const source=JSON.parse(result.stdout);const pg=new PrismaClient();let total=0;
 try{await pg.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  for(const model of Prisma.dmmf.datamodel.models){
   const rows=source[model.name]||[];
   const actual=await tx[model.name[0].toLowerCase()+model.name.slice(1)].findMany();
   if(rows.length!==actual.length)throw Error(`Count mismatch: ${model.name}`);
   const index=new Map(actual.map(r=>[r.id,r]));
   for(const row of rows){const saved=index.get(row.id);if(!saved)throw Error('Missing record.');
    for(const f of model.fields.filter(f=>f.kind!=='object'&&Object.hasOwn(row,f.name))){
     const value=row[f.name]===null?null:f.type==='DateTime'?new Date(row[f.name]):f.type==='Boolean'?Boolean(row[f.name]):row[f.name];
     if(JSON.stringify(saved[f.name])!==JSON.stringify(value))throw Error(`Value mismatch: ${model.name}.${f.name}`);
    }
   }total+=rows.length;
  }
 },{timeout:120000});console.log(`Read-only verification passed: all ${total} original records and stored fields match PostgreSQL.`);
 }finally{await pg.$disconnect();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
