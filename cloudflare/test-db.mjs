import {DatabaseSync} from 'node:sqlite';
export function testDatabase() {
  const sql=new DatabaseSync(':memory:');
  sql.exec(`CREATE TABLE sessions(code TEXT PRIMARY KEY,data TEXT,owner_id TEXT,admin_token TEXT,ended INTEGER DEFAULT 0,ended_at TEXT);
CREATE TABLE users(code TEXT,id TEXT,data TEXT,token_hash TEXT,account_id TEXT,last_seen TEXT,finished_at TEXT,PRIMARY KEY(code,id));
CREATE TABLE records(code TEXT,id TEXT,data TEXT,time TEXT,user_id TEXT,PRIMARY KEY(code,id));
CREATE TABLE attempts(key TEXT PRIMARY KEY,n INTEGER,until INTEGER);
CREATE TABLE audit(at TEXT,actor TEXT,action TEXT,target TEXT);
CREATE TABLE accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE,name TEXT,role TEXT,password TEXT,active INTEGER DEFAULT 1);
CREATE TABLE logins(hash TEXT PRIMARY KEY,account_id TEXT,expires INTEGER);
CREATE TABLE historical_archive(code TEXT PRIMARY KEY,metadata TEXT,xlsx_base64 TEXT,sha256 TEXT);`);
  const db={prepare(query){return {bind(...args){const stmt=sql.prepare(query);return {async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){return {meta:{changes:Number(stmt.run(...args).changes)}}}}}}},async batch(stmts){sql.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
  return {sql,db};
}
