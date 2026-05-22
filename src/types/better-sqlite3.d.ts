declare module 'better-sqlite3' {
  class Database {
    constructor(filename: string);
    pragma(source: string): void;
    exec(sql: string): Database;
    prepare(sql: string): Statement;
  }
  interface Statement {
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: any[]): any;
    all(...params: any[]): any[];
  }
  export default Database;
}
