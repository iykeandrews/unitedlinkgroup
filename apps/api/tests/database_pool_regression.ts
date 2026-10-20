import 'reflect-metadata';
import assert from 'node:assert/strict';
import {NestFactory, ModulesContainer} from '@nestjs/core';
import {PrismaService, databasePoolUrl} from '../src/prisma.service';
import {AppModule} from '../src/app.module';
async function main(){
 const url=new URL(databasePoolUrl('postgresql://test:test@localhost/example?sslmode=require')!);
 assert.equal(url.searchParams.get('connection_limit'),'8');assert.equal(url.searchParams.get('pool_timeout'),'15');assert.equal(url.searchParams.get('sslmode'),'require');
 assert.equal(new URL(databasePoolUrl('postgresql://test:test@localhost/example?connection_limit=3')!).searchParams.get('connection_limit'),'3');
 let connected=0,disconnected=0;
 PrismaService.prototype.onModuleInit=async()=>{connected++;};
 PrismaService.prototype.onModuleDestroy=async()=>{disconnected++;};
 const app=await NestFactory.createApplicationContext(AppModule,{logger:false,abortOnError:false});
 try {
  const modules=app.get(ModulesContainer);let providers=0;
  for(const module of modules.values()) if(module.providers.has(PrismaService)) providers++;
  assert.equal(providers,1,'All feature modules must share one database provider');assert.equal(connected,1);
 }finally{await app.close();}
 assert.equal(disconnected,1);
 console.log('Full application dependency injection passed with exactly one shared database pool and bounded connection defaults');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
