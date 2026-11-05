const assert=require("node:assert/strict"),fs=require("fs"),vm=require("vm"),ts=require("typescript");
let popupBlocked=false,closed=0,requests=[],externalCalls=[],objectTypes=[];
class BrowserURL extends URL { static createObjectURL(blob){objectTypes.push(blob.type);return "blob:preview";} static revokeObjectURL(){} }
const image=new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB", "base64")],{type:"image/png"});
const api={defaults:{baseURL:"/api"},get:async(url,options)=>{requests.push({url,options});return {data:image};}};
const window={location:{origin:"https://example.com"},open:()=>popupBlocked?null:{opener:{},location:{href:""},close:()=>closed++},setTimeout:()=>0};
const exported={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("apps/web/src/lib/qualification-documents.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{
 exports:exported,require:key=> key==="./api"?{__esModule:true,default:api}:{resolveApiUrl:path=>path.startsWith("http")?path:"https://example.com/api"+path},URL:BrowserURL,Blob,window,
 fetch:async(url,options)=>{externalCalls.push({url,options});return {ok:true,blob:async()=>image};}
});
(async()=>{
 await exported.openQualificationDocument("/uploads/file-license.png");
 assert.equal(requests[0].url,"https://example.com/api/uploads/file-license.png?stream=1");
 assert.equal(requests[0].options.responseType,"blob");
 assert.equal(objectTypes[0],"image/png");
 await exported.openQualificationDocument("https://other.example/license.png");
 assert.equal(requests.length,1);
 assert.equal(externalCalls[0].options.credentials,"omit");
 assert.equal(exported.credentialDisplay("2026-11-05T00:00:00Z"),"11/05/2026");
 popupBlocked=true;
 await assert.rejects(()=>exported.openQualificationDocument("/uploads/new.png"),/pop-ups/);
 console.log("Web credential documents passed: protected same-origin streaming, image previews, external credential isolation and MM/DD/YYYY display.");
})().catch(e=>{console.error(e);process.exitCode=1;});
