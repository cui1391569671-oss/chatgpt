"""Convert an explicitly supplied D1 SQL export into bounded restore statements.

Offline only. Never connects to Cloudflare. Output contains sensitive source data.
Restore ONLY to a new isolated database. Triggers are installed after all rows.
"""
import argparse
import sqlite3
from pathlib import Path

def quoted(name):
    return '"' + name.replace('"', '""') + '"'

def literal(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bytes):
        return "X'" + value.hex() + "'"
    if isinstance(value, str):
        return "CAST(X'" + value.encode('utf-8').hex() + "' AS TEXT)"
    return repr(value)

def restore_statements(db):
    schema = db.execute("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL ORDER BY type,name").fetchall()
    tables = [(name, sql) for kind, name, sql in schema if kind == 'table']
    for _, sql in tables:
        yield sql + ';'
    for name, _ in tables:
        columns = [row[1] for row in db.execute('PRAGMA table_info(' + quoted(name) + ')')]
        for row in db.execute('SELECT rowid,* FROM ' + quoted(name)):
            rowid, values = row[0], row[1:]
            chunks = [[value[i:i+2048] for i in range(0, len(value), 2048)] or [value] if isinstance(value, (str, bytes)) else [value] for value in values]
            yield 'INSERT INTO ' + quoted(name) + '(rowid,' + ','.join(map(quoted, columns)) + ') VALUES (' + str(rowid) + ',' + ','.join(literal(parts[0]) for parts in chunks) + ');'
            for column, value, parts in zip(columns, values, chunks):
                for part in parts[1:]:
                    expression = quoted(column) + '||' + literal(part)
                    if isinstance(value, bytes):
                        expression = 'CAST(' + expression + ' AS BLOB)'
                    yield 'UPDATE ' + quoted(name) + ' SET ' + quoted(column) + '=' + expression + ' WHERE rowid=' + str(rowid) + ';'
    for kind, _, sql in schema:
        if kind != 'table':
            yield sql + ';'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    destination = Path(args.output)
    if destination.exists():
        raise SystemExit('Refusing to overwrite an existing recovery artifact')
    db = sqlite3.connect(':memory:')
    db.executescript(Path(args.input).read_text())
    with destination.open('x') as output:
        destination.chmod(0o600)
        for statement in restore_statements(db):
            if len(statement.encode()) > 90000:
                raise ValueError('Statement exceeds safety bound; review schema/column count')
            output.write(statement + '\n')
    db.close()
    print('Prepared bounded restore statements; no remote database accessed.')

if __name__ == '__main__':
    main()
