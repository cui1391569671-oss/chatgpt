"""Synthetic SQLite recovery exercise. Never opens production or repository data."""
import sqlite3, json, hashlib, tempfile
from pathlib import Path
import importlib.util

spec=importlib.util.spec_from_file_location('bounded_restore',Path(__file__).with_name('prepare-d1-recovery.py'))
bounded_restore=importlib.util.module_from_spec(spec);spec.loader.exec_module(bounded_restore)

def digest(db):
    return {table: hashlib.sha256(repr(db.execute('SELECT * FROM '+table+' ORDER BY 1').fetchall()).encode()).hexdigest()
            for table in ('tracker_state','wardrobe_images','calendar_images','account_vault','project_core_information')}

def main():
    with tempfile.TemporaryDirectory(prefix='workbench-recovery-') as folder:
        source=sqlite3.connect(':memory:')
        source.executescript('CREATE TABLE tracker_state(id INTEGER PRIMARY KEY,payload TEXT,version INTEGER); CREATE TABLE wardrobe_images(id TEXT PRIMARY KEY,bytes BLOB); CREATE TABLE calendar_images(id TEXT PRIMARY KEY,scope TEXT,bytes BLOB); CREATE TABLE account_vault(owner TEXT PRIMARY KEY,envelope TEXT,version INTEGER); CREATE TABLE project_core_information(id INTEGER PRIMARY KEY,payload TEXT);')
        state={'data':[{'id':'issue-1'}],'archive':[],'workspace':{'tasks':[{'id':'personal-1'}]},'workWorkspace':{'tasks':[{'id':'work-1'}]},'workspaceVersions':{'personal':3,'work':7}}
        source.execute('INSERT INTO tracker_state VALUES(1,?,9)',(json.dumps(state),))
        source.execute('INSERT INTO wardrobe_images VALUES(?,?)',('synthetic',bytes([255,216,0,255,217])))
        source.execute('INSERT INTO calendar_images VALUES(?,?,?)',('event-image','work',bytes([255,216,1,255,217])))
        source.execute('INSERT INTO account_vault VALUES(?,?,?)',('fake-owner',json.dumps({'syntheticEnvelope':True}),2))
        source.execute('INSERT INTO project_core_information VALUES(1,?)',(json.dumps({'items':[]}),))
        backup=Path(folder)/'synthetic.sql';backup.write_text('\n'.join(source.iterdump()))
        restored=sqlite3.connect(':memory:');restored.executescript(backup.read_text())
        assert digest(source)==digest(restored)
        assert restored.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
        data=json.loads(restored.execute('SELECT payload FROM tracker_state').fetchone()[0]);assert data==state
        assert data['workspace']['tasks']!=data['workWorkspace']['tasks']
        source.executescript('CREATE TABLE restore_edge(id INTEGER PRIMARY KEY,text_value TEXT,blob_value BLOB,empty_value TEXT); CREATE TABLE trigger_log(id INTEGER); CREATE TRIGGER restore_edge_log AFTER UPDATE ON restore_edge BEGIN INSERT INTO trigger_log VALUES(new.id); END; CREATE INDEX restore_edge_text ON restore_edge(empty_value);')
        source.execute('INSERT INTO restore_edge VALUES(?,?,?,?)',(7,'中文🙂\x00'*30000,bytes(range(256))*800,None))
        bounded=sqlite3.connect(':memory:')
        statements=list(bounded_restore.restore_statements(source))
        assert max(len(statement.encode()) for statement in statements)<90000
        bounded.executescript('\n'.join(statements))
        assert bounded.execute('SELECT * FROM restore_edge').fetchall()==source.execute('SELECT * FROM restore_edge').fetchall()
        assert bounded.execute('SELECT count(*) FROM trigger_log').fetchone()[0]==0
        bounded.execute('UPDATE restore_edge SET empty_value=? WHERE id=7',('trigger test',))
        assert bounded.execute('SELECT id FROM trigger_log').fetchone()[0]==7
        bounded.close()
        print(json.dumps({'syntheticOnly':True,'tablesVerified':5,'integrity':'ok','blobsPreserved':True,'workspaceVersionsPreserved':True,'cloudflareRecoveryVerified':False},ensure_ascii=False))
        source.close();restored.close()
if __name__=='__main__':main()
