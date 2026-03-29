import pylibmql

x = pylibmql.parse('SELECT 1 FROM CLASS("MATH 2020") : "description" : 5;')

print(x.version())
print(x.json_pretty())