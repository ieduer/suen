#!/usr/bin/env node
// Shared source/provenance gate for native Pages builds and serial release jobs.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
export const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=m=>{throw Error(m)},read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const run=(exe,args,options={})=>(execFileSync(exe,args,{encoding:'utf8',timeout:20000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe'],...options})||'').trim();
const git=(...args)=>run('git',args);
export function normalizeRepo(x){try{const u=new URL(x.replace(/^git@github.com:/,'https://github.com/'));if(u.hostname!=='github.com'||!['https:','ssh:'].includes(u.protocol))return '';return 'https://github.com'+u.pathname.replace(/\/$/,'').replace(/\.git$/,'')}catch{return ''}}
export function validateSource(p,c){
 if(p.schema_version!==1||!p.target||!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(p.repository))fail('Invalid release channel contract');
 if(c.target!==p.target)fail('Wrong target');
 if(normalizeRepo(c.repository)!==p.repository)fail('Wrong repository');
 if(!/^[a-f0-9]{40}$/.test(c.head)||c.head!==c.remote_head)fail('Candidate is not the current exact remote branch head');
 if(c.branch!==p.branch)fail('Wrong production branch');
 if(c.dirty)fail('Tracked source is dirty');
 if(c.archived)fail('Historical archive is not a release source');
 if(!c.baseline_ancestor)fail('Candidate omits the accepted production source');
 if(c.live_source&&!c.live_ancestor)fail('Candidate omits a newer production source');
 if(c.live_target&&c.live_target!==p.target)fail('Production identity belongs to another target');
 for(const f of p.required_paths||[])if(!c.files.includes(f))fail('Required capability missing: '+f);
 return {target:p.target,source_commit:c.head,source_tree:c.tree};
}
export function safeAsset(name){return !name.split('/').some(x=>x==='..'||x.startsWith('.'))&&!/^(?:node_modules|functions|scripts|tests?|docs|reports|backups|exports|credentials|worker|server|\.release)(?:\/|$)/.test(name)&&!/(?:^|\/)(?:AGENTS|PROJECT_STATE|README|HANDOFF|MANUAL|CHANGELOG|LICENSE)(?:\.|$)/i.test(name)&&!/(?:^|\/)(?:package(?:-lock)?\.json|wrangler\.[^/]+|.*\.(?:env|pem|key|sqlite|db|sql|map))$/i.test(name)&&/\.(?:html?|css|js|mjs|json|webmanifest|txt|xml|png|jpe?g|gif|webp|svg|ico|avif|woff2?|ttf|eot|otf|mp[34]|ogg|wav|pdf|md)$/i.test(name)||['_headers','_redirects','_routes.json','_worker.js'].includes(name);}
export function filesAt(root){const out=[];function walk(d,p=''){for(const n of fs.readdirSync(d).sort()){const f=path.join(d,n),s=fs.lstatSync(f);if(s.isSymbolicLink())fail('Artifact contains symlink');if(s.isDirectory())walk(f,p+n+'/');else if(s.isFile())out.push({path:p+n,sha256:sha(fs.readFileSync(f)),bytes:s.size});else fail('Artifact contains a special file')}}walk(root);return out;}
async function get(url){const r=await fetch(url,{redirect:'follow',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});if(!r.ok)fail('Live read failed HTTP '+r.status);const b=Buffer.from(await r.arrayBuffer());if(b.length>12*1024*1024)fail('Live fingerprint exceeded budget');return b;}
export async function liveIdentity(p){
 let manifest;try{manifest=JSON.parse((await get(p.origin+'/__release.json')).toString())}catch{}
 if(manifest?.schema_version===1&&manifest.target){if(manifest.target!==p.target)fail('Live provenance target mismatch');if(!/^[a-f0-9]{40}$/.test(manifest.source_commit||''))fail('Live provenance source invalid');return {key:sha(JSON.stringify(manifest)),source:manifest.source_commit,target:manifest.target,manifest};}
 if(!p.bootstrap?.fingerprints?.length)fail('No production provenance or verified bootstrap fingerprint');
 for(const f of p.bootstrap.fingerprints){if(sha(await get(p.origin+f.path))!==f.sha256)fail('Unstamped production changed; reconcile source before automatic release');}
 return {key:sha(JSON.stringify(p.bootstrap)),source:p.baseline_commit,target:p.target,bootstrap:true};
}
export function ancestor(commit,branch){if(git('rev-parse','--is-shallow-repository')==='true')run('git',['fetch','--unshallow','--no-tags','origin',branch],{timeout:120000});try{git('cat-file','-e',commit+'^{commit}')}catch{git('fetch','--no-tags','origin',commit)}try{git('merge-base','--is-ancestor',commit,'HEAD');return true}catch{return false}}
export async function preflight(p,target,{live}={}){
 const root=git('rev-parse','--show-toplevel'),head=git('rev-parse','HEAD'),branch=process.env.CF_PAGES_BRANCH||process.env.GITHUB_REF_NAME||git('branch','--show-current');
 const remote=git('ls-remote','--exit-code','origin','refs/heads/'+p.branch).split(/\s/)[0];
 const l=live||await liveIdentity(p);const files=git('ls-files','-z').split('\0').filter(Boolean);
 const c={target,repository:git('remote','get-url','origin'),head,remote_head:remote,branch,dirty:!!git('status','--porcelain','--untracked-files=no'),archived:root.split(path.sep).includes('_archive'),baseline_ancestor:ancestor(p.baseline_commit,p.branch),live_ancestor:ancestor(l.source,p.branch),live_source:l.source,live_target:l.target,files,tree:git('rev-parse','HEAD^{tree}')};
 if(process.env.CF_PAGES_COMMIT_SHA&&process.env.CF_PAGES_COMMIT_SHA!==head)fail('Provider commit metadata differs from checkout');
 if(process.env.GITHUB_SHA&&process.env.GITHUB_SHA!==head)fail('Workflow commit differs from checkout');
 return {root,files,live:l,...validateSource(p,c)};
}
export function validateBootstrap(p,files){for(const f of p.bootstrap.fingerprints){const actual=files[f.artifact],expected=f.artifact_sha256||f.sha256;if(actual===expected)continue;const change=p.bootstrap.reviewed_changes?.find(c=>c.artifact===f.artifact&&c.before===expected&&c.after===actual&&c.reason?.trim()&&/^[a-f0-9]{40}$/.test(c.source_commit||''));if(!actual||!change)fail('First guarded build differs from verified live asset: '+f.artifact)}}
export async function build(p,target){
 const start=await preflight(p,target);
 for(const argv of p.checks||[]){if(!Array.isArray(argv)||!argv.length)fail('Invalid check');run(argv[0],argv.slice(1),{timeout:120000,stdio:'inherit'})}
 if(p.build_command)run('/bin/bash',['-euc',p.build_command],{timeout:600000,stdio:'inherit'});
 const output=path.resolve(p.output);if(!output.startsWith(start.root+path.sep))fail('Artifact must be a separate in-repository build directory');
 if(p.stage_tracked_static){if(fs.existsSync(output))fail('Static staging output already exists; refuse mixed artifact');fs.mkdirSync(output,{recursive:true});for(const rel of start.files.filter(safeAsset)){const src=path.resolve(rel);if(!src.startsWith(start.root+path.sep)||fs.lstatSync(src).isSymbolicLink())fail('Unsafe source asset');const to=path.join(output,rel);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(src,to)}}
 if(!fs.existsSync(output)||!fs.statSync(output).isDirectory())fail('Build artifact missing');
 const outputRelative=path.relative(start.root,output).replaceAll(path.sep,'/');const changedSource=git('diff','--name-only','HEAD').split('\n').filter(f=>f&&f!==outputRelative&&!f.startsWith(outputRelative+'/'));if(changedSource.length)fail('Build mutated tracked source: '+changedSource.slice(0,5).join(','));
 for(const f of p.required_artifacts||['index.html'])if(!fs.existsSync(path.join(output,f)))fail('Required output missing: '+f);
 const live=await liveIdentity(p);if(live.key!==start.live.key)fail('Production changed during build');
 if(start.live.bootstrap){const hashes={};for(const f of p.bootstrap.fingerprints){const file=path.join(output,f.artifact);hashes[f.artifact]=fs.existsSync(file)?sha(fs.readFileSync(file)):null;}for(const c of p.bootstrap.reviewed_changes||[])if(!ancestor(c.source_commit,p.branch))fail('Reviewed bootstrap change is not in candidate history');validateBootstrap(p,hashes)}
 if(git('rev-parse','HEAD')!==start.source_commit||git('ls-remote','--exit-code','origin','refs/heads/'+p.branch).split(/\s/)[0]!==start.source_commit)fail('Build superseded; refusing old source');
 // All output paths are hash-bound. The provenance file itself is excluded.
 const artifacts=filesAt(output).filter(f=>f.path!=='__release.json');
 const fn=fs.existsSync('functions')?filesAt('functions'):[];
 const manifest={schema_version:1,target,repository:p.repository,source_commit:start.source_commit,source_tree:start.source_tree,policy_sha256:sha(JSON.stringify(p)),artifact_sha256:sha(JSON.stringify(artifacts)),artifacts,function_inputs:fn,previous_source:start.live.source,created_at:new Date().toISOString()};
 fs.writeFileSync(path.join(output,'__release.json'),JSON.stringify(manifest)+'\n');
 console.log(JSON.stringify({release_gate:'passed',target,source_commit:start.source_commit,files:artifacts.length,artifact_sha256:manifest.artifact_sha256}));return manifest;
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [cmd,file,target]=process.argv.slice(2);const policies=read(file);const p=policies.targets.find(p=>p.target===target);if(!p)fail('Unknown release target');if(cmd==='preflight')console.log(JSON.stringify(await preflight(p,target)));else if(cmd==='build')await build(p,target);else fail('Usage: guard.mjs build|preflight POLICIES_JSON TARGET')}catch(e){console.error('[release-channel] BLOCKED: '+String(e.message).replace(/https:\/\/[^/@\s]+@/g,'https://[REDACTED]@').slice(0,1000));process.exitCode=1}
}
